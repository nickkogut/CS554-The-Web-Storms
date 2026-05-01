import amqplib from 'amqplib';
import { QUEUES } from '../../config/rabbitmq.js';
import {dbConnection} from '../../config/mongoConnection.js';

const RABBITMQ_URL = process.env.RABBITMQ_URL ||  'amqp://guest:guest@localhost:5672';

async function start(){
    const db = await dbConnection();
    const collection = db.collection('completedQuizzes');

    const connection = await amqplib.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUES.QUIZ_RESULT, {durable: true});
    channel.prefetch(1);

    channel.consume(QUEUES.QUIZ_RESULT, async(msg)=>{
        if(!msg) return;

        try{
            const data = JSON.parse(msg.content.toString());
            await collection.insertOne(data);

            channel.ack(msg);
        }
        catch(e){
            console.error('Error with rabbit worker:', e);
            channel.nack(msg, false, false);
        }
    })
}

start();
