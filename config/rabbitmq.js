import amqp from 'amqplib'
import logger from '../logger.js';
let channel;
const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL||'amqp://localhost');
    channel = await connection.createChannel();
    logger.info('RabbitMQ connected successfully');
    return channel
  } catch (error) {
    logger.error('Error connecting to RabbitMQ:', error.message);
    throw error;
  }
}
//nnectRabbitMQ()
export { connectRabbitMQ, channel };
