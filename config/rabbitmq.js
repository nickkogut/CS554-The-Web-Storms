import amqplib from 'amqplib';
import { Buffer } from 'buffer';
import dotenv from 'dotenv';

dotenv.config();

const env = globalThis.process?.env || {};
const RABBITMQ_ENABLED = env.ENABLE_RABBITMQ === 'true';
const RABBITMQ_URL = env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

export const QUEUES = {
  QUIZ_RESULT: 'quiz_result'
};

let connection = null;
let channel = null;

export async function connectRabbitMQ() {
  if (!RABBITMQ_ENABLED) {
    console.log('RabbitMQ disabled. Skipping connection.');
    return null;
  }

  if (channel) return channel;

  try {
    connection = await amqplib.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUES.QUIZ_RESULT, { durable: true });

    console.log('RabbitMQ connected.');
    return channel;
  } catch (err) {
    console.error('RabbitMQ unavailable. Continuing without it.', err);
    return null;
  }
}

export function publish(queue, payload) {
  if (!RABBITMQ_ENABLED || !channel) return false;

  channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
    persistent: true
  });

  return true;
}

export async function closeRabbitMQ() {
  try {
    if (connection) {
      await connection.close();
    }
  } catch (err) {
    console.error(err);
  }

  connection = null;
  channel = null;
}