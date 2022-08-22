# Todo app API

## Getting Started

This API is containerized so you should be up and running should you run

```bash
npm run compose:up
```

**But before you do**, you'll need to set your environment variables. Create a .env file
with the following non-sensitive values

```text
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=todos
POSTGRES_PORT=5432

PORT=5003
SERVER_HOST=0.0.0.0
```

However, you can run the server nude if you have NodeJS installed on your machine. If you
prefer this route, you first need to run

```bash
npm i
```

then run either

```bash
npm run dev

# or

npm start
```

To access the documentation for this API, navigate to to the **/api/documentation** route!
