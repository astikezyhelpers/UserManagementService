import { connectRabbitMQ } from '../config/rabbitmq.js';
import sendEmail from '../emailServices/email.js';

const QUEUE_NAME = 'email_verification';

/**
 * Start consuming email_verification queue and send emails
 */
export const startConsumer = async () => {
  const channel = await connectRabbitMQ();
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  console.log(`Consumer listening on queue: ${QUEUE_NAME}`);

  channel.consume(QUEUE_NAME, async (msg) => {
    if (msg) {
      const { email, token } = JSON.parse(msg.content.toString());
      try {
        await sendEmail(email, token);
        channel.ack(msg);
      } catch (err) {
        console.error('Email send failed, requeueing:', err.message);
        channel.nack(msg, false, true);
      }
    }
  });
};

