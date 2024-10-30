import express from 'express';
import amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

const RABBITMQ_URL = 'amqp://guest:guest@localhost:5672';
const REQUEST_QUEUE = 'request_queue';
const REPLY_QUEUE = 'reply_queue';

let channel: amqp.Channel;

// Simple in-memory storage for request statuses and results
const requests: {
  [key: string]: {
    timestamp: number, status: string, result?: string
  }
} = {};

// Clean up completed requests after 5 minutes
const cleanupRequests = () => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  Object.entries(requests).forEach(([correlationId, request]) => {
    if (request.timestamp && request.timestamp < fiveMinutesAgo) {
      delete requests[correlationId];
    }
  });
};

setInterval(cleanupRequests, 60 * 1000); // Run cleanup every minute

async function setupReplyQueueConsumer() {
  console.log('Setting up reply queue consumer...');
  await channel.consume(REPLY_QUEUE, (msg) => {
    if (msg) {
      const correlationId = msg.properties.correlationId;
      if (correlationId && requests[correlationId]) {
        const reply = msg.content.toString();
        console.log(`[${new Date().toISOString()}] Received reply for ${correlationId}: ${reply}`);
        requests[correlationId] = {
          status: 'Completed',
          result: reply,
          timestamp: Date.now()
        };
        channel.ack(msg);
        console.log(`[${new Date().toISOString()}] Processing for ${correlationId} completed`);
      } else {
        channel.nack(msg, false, false); // Reject message if no matching request
      }
    }
  });
  console.log('Reply queue consumer setup completed');
}

async function setupRabbitMQ() {
  try {
    console.log('Connecting to RabbitMQ...');
    const connection = await amqp.connect(RABBITMQ_URL, { protocol: 'amqp' });
    console.log('Connected to RabbitMQ');

    channel = await connection.createChannel();
    console.log('Channel created');

    await channel.assertQueue(REQUEST_QUEUE);
    await channel.assertQueue(REPLY_QUEUE);
    console.log('Queues asserted');

    await setupReplyQueueConsumer();

    connection.on('error', (err) => {
      console.error('RabbitMQ connection error', err);
    });

    connection.on('close', () => {
      console.error('RabbitMQ connection closed');
      setTimeout(setupRabbitMQ, 5000);
    });
  } catch (error) {
    console.error('Failed to connect to RabbitMQ', error);
    setTimeout(setupRabbitMQ, 5000);
  }
}

setupRabbitMQ();

app.post('/api/request', async (req, res) => {
  const { message } = req.body;
  const correlationId = uuidv4();

  console.log(`[${new Date().toISOString()}] Received request: ${message}`);
  console.log(`[${new Date().toISOString()}] Generated correlation ID: ${correlationId}`);

  // Initialize request status
  requests[correlationId] = {
    status: 'Processing',
    timestamp: Date.now()
  };

  try {
    channel.sendToQueue(REQUEST_QUEUE, Buffer.from(message), {
      correlationId,
      replyTo: REPLY_QUEUE,
    });

    console.log(`[${new Date().toISOString()}] Sent message to REQUEST_QUEUE`);

    res.status(202).json({
      status: 'Accepted',
      message: 'Request accepted for processing',
      correlationId
    });

    console.log(`[${new Date().toISOString()}] Sent 202 Accepted response`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error sending message:`, error);
    delete requests[correlationId];
    res.status(500).json({ error: 'Failed to process request' });
  }
});

app.get('/api/status/:correlationId', (req, res) => {
  const { correlationId } = req.params;
  console.log(`[${new Date().toISOString()}] Received status request for ${correlationId}`);

  if (requests[correlationId]) {
    res.json(requests[correlationId]);
  } else {
    res.status(404).json({ error: 'Request not found' });
  }
});

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});