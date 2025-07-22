import { connectRabbitMQ } from '../config/rabbitmq.js';

let channel;
const QUEUE_NAME = 'email_verification';

/**
 * Initialize RabbitMQ channel and queue
 */
export const initPublisher = async () => {
  channel = await connectRabbitMQ();
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  console.log(`Publisher initialized, queue: ${QUEUE_NAME}`);
};

/*
 * Publish message to email_verification queue
 * @param {{ email: string, token: string }} payload
 */
export const publishVerificationEmail = async (payload) => {
  if (!channel) {
    await initPublisher();
  }
  channel.sendToQueue(
    QUEUE_NAME,
    Buffer.from(JSON.stringify(payload)),
    { persistent: true }
  );
  console.log(`📨 Published to ${QUEUE_NAME}:`, payload);
};