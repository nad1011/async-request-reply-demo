// server.ts
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
const requests: { [key: string]: { status: string, result?: string } } = {};

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

  requests[correlationId] = { status: 'Processing' };

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

  channel.consume(REPLY_QUEUE, (msg) => {
    if (msg && msg.properties.correlationId === correlationId) {
      const reply = msg.content.toString();
      console.log(`[${new Date().toISOString()}] Received reply for ${correlationId}: ${reply}`);
      requests[correlationId] = { status: 'Completed', result: reply };
      channel.ack(msg);
      console.log(`[${new Date().toISOString()}] Processing for ${correlationId} completed`);
    }
  });
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
