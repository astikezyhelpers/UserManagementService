import { connectRabbitMQ } from '../config/rabbitmq.js';
import sendEmail from '../emailservice/email.js';

const QUEUE_NAME = 'email_verification';

export const startConsumer = async () => {
  console.log('Starting consumer...');
  const channel = await connectRabbitMQ();
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  console.log(`Consumer listening on queue: ${QUEUE_NAME}`);

  channel.consume(QUEUE_NAME, async (msg) => {
    console.log('Message received:', msg ? msg.content.toString() : 'null');
    if (msg) {
      const { email, token } = JSON.parse(msg.content.toString());
      try {
        console.log('Sending email to:', email, 'with token:', token);
        await sendEmail(email, token);
        channel.ack(msg);
      } catch (err) {
        console.error('Email send failed, requeueing:', err.message);
        channel.nack(msg, false, true);
      }
    }
  });
};

// Make sure to call startConsumer if this is your entry file:
startConsumer();

