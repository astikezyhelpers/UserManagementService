import amqp from 'amqplib'
let channel;
const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL||'amqp://localhost');
    channel = await connection.createChannel();
    console.log('RabbitMQ connected successfully');
    return channel
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error.message);
    throw error;
  }
}
//connectRabbitMQ()
export { connectRabbitMQ, channel };
