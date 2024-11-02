# Image Search Demo with Async Request-Reply Pattern

This project demonstrates the implementation of an asynchronous request-reply pattern using RabbitMQ as the message broker. The application allows users to search for images by entering keywords, with the search process handled asynchronously to provide a responsive user experience.

## Architecture Overview

The system consists of three main components:
- Front-end (React application)
- API Server (Express.js)
- Worker Service (Image search processor)

### Flow Diagram

```
[Frontend] → [API Server] → [RabbitMQ] → [Worker] → [Google Image Search]
     ↑          ↑               ↓           ↓
     └──────────┴───────────────┴───────────┘
         Status polling & Results
```

## Key Features

- Asynchronous request processing
- Real-time status updates
- Message queue fault tolerance
- Clean UI with step-by-step progress tracking

## Prerequisites

- Node.js (v14 or higher)
- RabbitMQ Server
- Google Custom Search API credentials

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd async-request-reply-demo
   ```

2. **Install NodeJs**
   - For MacOS:
     ```bash
     brew install node
     ```
   - For Ubuntu:
     ```bash
     curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
     sudo apt-get install -y nodejs
     ```
   - For Windows:
     Download and install from [NodeJs official website](https://nodejs.org/en)

3. **Install RabbitMQ**
   - For MacOS:
     ```bash
     brew install rabbitmq
     ```
   - For Ubuntu:
     ```bash
     apt-get install rabbitmq-server
     ```
   - For Windows:
     Download and install from [RabbitMQ official website](https://www.rabbitmq.com/download.html)

4. **Set up environment variables**
   Create `.env` file in the ./async-request-reply-backend directory:
   ```env
   # RabbitMQ Configuration
   RABBITMQ_URL=amqp://localhost
   REQUEST_QUEUE=image_search_requests
   REPLY_QUEUE=image_search_replies

   # Google API Configuration
   GOOGLE_SEARCH_API=https://www.googleapis.com/customsearch/v1
   GOOGLE_API_KEY=your_google_api_key
   GOOGLE_CX=your_google_custom_search_cx
   ```

5. **Install dependencies**
   ```bash
   # Install front-end dependencies
   cd async-request-reply-frontend
   npm install

   # Install API server and worker dependencies
   cd async-request-reply-backend
   npm install
   ```

## Running the Application

1. **Start RabbitMQ Server**
   ```bash
   # MacOS
   brew services start rabbitmq

   # Ubuntu
   service rabbitmq-server start

   # Windows
   restart your computer after install rabbitmq, it will automatically start as a service
   ```

2. **Start the API Server and Worker**
   ```bash
   cd async-request-reply-backend
   npm run start:server
   npm run start:worker
   ```

3. **Start the Frontend Application**
   ```bash
   cd async-request-reply-frontend
   npm start
   ```

## How It Works

### 1. Request Initiation
- User enters a search term in the frontend
- Frontend sends a POST request to `/api/request`
- API server generates a unique `correlationId`

### 2. Message Queue Processing
- API server:
  - Publishes message to `REQUEST_QUEUE` with `correlationId` and `replyTo` queue
  - Stores request status in memory
  - Returns `202 Accepted` response with `correlationId`

### 3. Worker Processing
- Worker:
  - Consumes messages from `REQUEST_QUEUE`
  - Processes image search request using Google API
  - Publishes result to `REPLY_QUEUE` with matching `correlationId`

### 4. Status Updates & Result Delivery
- Frontend polls `/api/status/{correlationId}`
- API server:
  - Monitors `REPLY_QUEUE` for responses
  - Updates request status when reply received
  - Delivers result to frontend via status endpoint

## Error Handling

- Failed requests are automatically retried
- Connection issues with RabbitMQ trigger reconnection attempts
- Worker errors are propagated back to the client
- Request timeouts after 5 minutes of inactivity

## Monitoring and Debugging

The application provides detailed logging at each step:
- Request receipt and correlation ID generation
- Queue message publishing and consumption
- Worker processing status
- API response delivery

## Contributing

Feel free to submit issues and enhancement requests!