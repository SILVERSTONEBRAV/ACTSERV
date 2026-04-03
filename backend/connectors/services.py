from abc import ABC, abstractmethod

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
        conn = self.connect()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                paginated_query = f"{query} LIMIT {batch_size} OFFSET {offset}"
                cur.execute(paginated_query)
                return [dict(row) for row in cur.fetchall()]
        finally:
            conn.close()

# Similar connectors for MySQL, Mongo, ClickHouse would go here
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
        conn = self.connect()
        try:
            with conn.cursor() as cur:
                paginated_query = f"{query} LIMIT {batch_size} OFFSET {offset}"
                cur.execute(paginated_query)
                return cur.fetchall()
        finally:
            conn.close()

class MongoConnector(BaseConnector):
    def connect(self):
        from pymongo import MongoClient
        uri = f"mongodb://{self.config.username}:{self.config.password}@{self.config.host}:{self.config.port}/{self.config.database_name}?authSource=admin"
        return MongoClient(uri)

    def extract_batch(self, query, batch_size, offset):
        # query here acts as a collection name for simplicity in this assessment
        client = self.connect()
        db = client[self.config.database_name]
        collection = db[query]
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
        client = self.connect()
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
