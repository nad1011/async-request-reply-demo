import amqp from 'amqplib';
import axios from 'axios';
import 'dotenv/config';

async function searchImage(query: string): Promise<string> {
  console.log(`[${new Date().toISOString()}] Searching for image: ${query}`);

  const googleSearchApis = process.env.GOOGLE_SEARCH_API ?? '';
  const googleApisKey = process.env.GOOGLE_API_KEY ?? '';
  const googleCx = process.env.GOOGLE_CX ?? '';

  try {
    const response = await axios.get(googleSearchApis, {
      params: {
        key: googleApisKey,
        cx: googleCx,
        q: query,
        searchType: 'image',
        num: 1
      }
    });

    if (response.data.items && response.data.items.length > 0) {
      const imageUrl = response.data.items[0].link;
      console.log(`[${new Date().toISOString()}] Found image: ${imageUrl}`);
      return imageUrl;
    } else {
      throw new Error('No images found');
    }
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Error searching for image:`, error);
    throw new Error(`Failed to search for image: ${error.message}`);
  }
}

async function processMessage(msg: string): Promise<string> {
  console.log(`[${new Date().toISOString()}] Processing message: ${msg}`);
  const imageUrl = await searchImage(msg);
  console.log(`[${new Date().toISOString()}] Finished processing: ${imageUrl}`);
  return imageUrl;
}

async function startWorker() {
  const rabbitMqUrl = process.env.RABBITMQ_URL ?? '';
  const requestQueue = process.env.REQUEST_QUEUE ?? '';

  try {
    console.log('Worker connecting to RabbitMQ...');
    const connection = await amqp.connect(rabbitMqUrl, { protocol: 'amqp' });
    console.log('Worker connected to RabbitMQ');

    const channel = await connection.createChannel();
    console.log('Worker channel created');

    await channel.assertQueue(requestQueue);
    console.log(`Worker asserted ${requestQueue}`);

    await channel.prefetch(1);
    console.log('Worker is waiting for messages...');

    channel.consume(requestQueue, async (msg) => {
      if (msg) {
        try {
          console.log(`[${new Date().toISOString()}] Worker received message: ${msg.content.toString()}`);
          const reply = await processMessage(msg.content.toString());

          channel.sendToQueue(msg.properties.replyTo, Buffer.from(reply), {
            correlationId: msg.properties.correlationId,
          });

          console.log(`[${new Date().toISOString()}] Worker sent reply: ${reply}`);
          channel.ack(msg);
        } catch (error: any) {
          console.error(`[${new Date().toISOString()}] Error processing message:`, error);
          // Send error message back to client
          const errorMessage = `Error: ${error.message}`;
          channel.sendToQueue(msg.properties.replyTo, Buffer.from(errorMessage), {
            correlationId: msg.properties.correlationId,
          });
          channel.ack(msg);
        }
      }
    });

    connection.on('error', (err) => {
      console.error('Worker RabbitMQ connection error', err);
    });

    connection.on('close', () => {
      console.error('Worker RabbitMQ connection closed');
      setTimeout(startWorker, 5000);
    });
  } catch (error) {
    console.error('Worker failed to start:', error);
    setTimeout(startWorker, 5000);
  }
}

startWorker();
