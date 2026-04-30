import amqplib from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

export const QUEUES = {
    QUIZ_RESULT: 'quiz_result',
};

let channel = null;

export async function connectRabbitMQ(){
    const connection = await amqplib.connect(RABBITMQ_URL);
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