from abc import ABC, abstractmethod
import re


def _sanitize_query(query: str) -> str:
    """Basic SQL injection guard — reject dangerous patterns."""
    dangerous = re.compile(
        r'\b(DROP|ALTER|TRUNCATE|DELETE|UPDATE|INSERT|EXEC|EXECUTE|CREATE|GRANT|REVOKE)\b',
        re.IGNORECASE
    )
    if dangerous.search(query):
        raise ValueError("Query contains forbidden SQL keywords. Only SELECT queries are allowed.")
    # Strip trailing semicolons to prevent statement chaining
    query = query.rstrip(';').strip()
    if not query:
        raise ValueError("Query cannot be empty")
    return query


class BaseConnector(ABC):
    def __init__(self, config):
        self.config = config

    @abstractmethod
    def connect(self):
        pass

    @abstractmethod
    def extract_batch(self, query, batch_size, offset):
        pass


class PostgresConnector(BaseConnector):
    def connect(self):
        import psycopg2
        import psycopg2.extras
        return psycopg2.connect(
            dbname=self.config.database_name,
            user=self.config.username,
            password=self.config.password,
            host=self.config.host,
            port=self.config.port
        )

    def extract_batch(self, query, batch_size, offset):
        query = _sanitize_query(query)
        conn = self.connect()
        try:
            import psycopg2.extras
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                # Use parameterized LIMIT/OFFSET to prevent injection
                paginated_query = f"{query} LIMIT %s OFFSET %s"
                cur.execute(paginated_query, (batch_size, offset))
                return [dict(row) for row in cur.fetchall()]
        finally:
            conn.close()


class MySQLConnector(BaseConnector):
    def connect(self):
        import pymysql
        return pymysql.connect(
            host=self.config.host,
            user=self.config.username,
            password=self.config.password,
            database=self.config.database_name,
            port=self.config.port,
            cursorclass=pymysql.cursors.DictCursor
        )

    def extract_batch(self, query, batch_size, offset):
        query = _sanitize_query(query)
        conn = self.connect()
        try:
            with conn.cursor() as cur:
                # Use parameterized LIMIT/OFFSET
                paginated_query = f"{query} LIMIT %s OFFSET %s"
                cur.execute(paginated_query, (batch_size, offset))
                return cur.fetchall()
        finally:
            conn.close()


class MongoConnector(BaseConnector):
    def connect(self):
        from pymongo import MongoClient
        uri = f"mongodb://{self.config.username}:{self.config.password}@{self.config.host}:{self.config.port}/{self.config.database_name}?authSource=admin"
        return MongoClient(uri)

    def extract_batch(self, query, batch_size, offset):
        # query here acts as a collection name — sanitize it
        collection_name = re.sub(r'[^a-zA-Z0-9_]', '', query)
        if not collection_name:
            raise ValueError("Invalid collection name")
        client = self.connect()
        db = client[self.config.database_name]
        collection = db[collection_name]
        data = list(collection.find({}).skip(offset).limit(batch_size))
        for item in data:
            item['_id'] = str(item['_id'])
        client.close()
        return data


class ClickHouseConnector(BaseConnector):
    def connect(self):
        import clickhouse_connect
        return clickhouse_connect.get_client(
            host=self.config.host,
            port=self.config.port,
            username=self.config.username,
            password=self.config.password,
            database=self.config.database_name
        )

    def extract_batch(self, query, batch_size, offset):
        query = _sanitize_query(query)
        client = self.connect()
        # ClickHouse doesn't support parameterized LIMIT/OFFSET the same way,
        # but we validate batch_size and offset are integers
        batch_size = int(batch_size)
        offset = int(offset)
        paginated_query = f"{query} LIMIT {batch_size} OFFSET {offset}"
        result = client.query(paginated_query)
        columns = result.column_names
        data = [dict(zip(columns, row)) for row in result.result_rows]
        return data


def extract_data_with_connector(connection_config, query, batch_size, offset):
    connector_classes = {
        'POSTGRES': PostgresConnector,
        'MYSQL': MySQLConnector,
        'MONGO': MongoConnector,
        'CLICKHOUSE': ClickHouseConnector
    }

    cls = connector_classes.get(connection_config.db_type)
    if not cls:
        raise ValueError("Unsupported Database Type")

    connector = cls(connection_config)
    return connector.extract_batch(query, batch_size, offset)
