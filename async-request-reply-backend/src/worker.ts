import amqp from 'amqplib';

const RABBITMQ_URL = 'amqp://guest:guest@localhost:5672';
const REQUEST_QUEUE = 'request_queue';

async function processMessage(msg: string): Promise<string> {
  console.log(`[${new Date().toISOString()}] Processing message: ${msg}`);
  await new Promise(resolve => setTimeout(resolve, 2000));
  const result = `Processed: ${msg.toUpperCase()}`;
  console.log(`[${new Date().toISOString()}] Finished processing: ${result}`);
  return result;
}

async function startWorker() {
  try {
    console.log('Worker connecting to RabbitMQ...');
    const connection = await amqp.connect(RABBITMQ_URL, { protocol: 'amqp' });
    console.log('Worker connected to RabbitMQ');

    const channel = await connection.createChannel();
    console.log('Worker channel created');

    await channel.assertQueue(REQUEST_QUEUE);
    console.log('Worker asserted REQUEST_QUEUE');

    console.log('Worker is waiting for messages...');

    channel.consume(REQUEST_QUEUE, async (msg) => {
      if (msg) {
        console.log(`[${new Date().toISOString()}] Worker received message: ${msg.content.toString()}`);
        const reply = await processMessage(msg.content.toString());
        channel.sendToQueue(msg.properties.replyTo, Buffer.from(reply), {
          correlationId: msg.properties.correlationId,
        });
        console.log(`[${new Date().toISOString()}] Worker sent reply: ${reply}`);
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error('Worker failed to start:', error);
  }
}

startWorker();