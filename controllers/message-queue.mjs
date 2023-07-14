
import { ServiceBusClient, delay } from "@azure/service-bus"

class MessageQueue {
    url = '';
    queue = '';
    constructor({ URL, QUEUE }) {
        this.url = URL;
        this.queue = QUEUE
        this.client = new ServiceBusClient(this.url);
    }

    async addToQueue({ message }) {
        try {
            // sending a single message
            const sender = this.client.createSender(this.queue);
            let batch = message;
            if (Array.isArray(message)) {
                batch = await sender.createMessageBatch();
                for (let msg of message) {
                    if (!batch.tryAddMessage(msg)) {
                        await sender.sendMessages(batch);
                        batch = await sender.createMessageBatch();
                        if (!batch.tryAddMessage(msg)) {
                            throw new Error("Message too big to fit in a batch");
                        }
                    }
                }
            }
            await sender.sendMessages(batch);
            return {
                status: true
            }
        } catch (err) {
            console.log(err)
            return {
                status: false,
                error: err
            }
        }
    }

    async receiveFromQueue({ handler, errorHandler }) {
        if (typeof handler !== "function") {
            throw new Error('handler must be a function')
        }
        if (typeof errorHandler !== "function") {
            throw new Error('error handler must be a function')
        }
        const receiver = this.client.createReceiver(this.queue);
        receiver.subscribe({
            processMessage: handler,
            processError: errorHandler
        });

        delay(2);
        receiver.close()
    }
}

export default MessageQueue;
