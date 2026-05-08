import amqplib from 'amqplib';
import { startUp } from '../src/workers/quizResultWorker.js';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

export const QUEUES = {
    QUIZ_RESULT: 'quiz_result',
};

let channel = null;

export async function connectRabbitMQ(){
    const connection = await connectWithRetry(process.env.RABBITMQ_URL);
    await startUp();
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUES.QUIZ_RESULT, {durable: true});
    console.log('RabbitMQ connected');
}

export function publish(queue, payload){
    if(!channel) throw new Error('RabbitMQ not connected');
    channel.sendToQueue(
        queue, 
        Buffer.from(JSON.stringify(payload)),
        {persistent: true}
    );
}

async function connectWithRetry(url, retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await amqplib.connect(url);
      console.log('Connected to RabbitMQ');
      return conn;
    } catch (err) {
      console.log(`RabbitMQ not ready, retrying in ${delay}ms... (${i + 1}/${retries})`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error('Could not connect to RabbitMQ after retries');
}