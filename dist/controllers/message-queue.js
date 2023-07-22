"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _serviceBus = require("@azure/service-bus");
class MessageQueue {
  url = '';
  queue = '';
  topic = '';
  defaultSubscription = 'no-filter';
  constructor({
    URL,
    QUEUE,
    TOPIC,
    SUBSCRIPTION_CONFIG
  }) {
    this.url = URL;
    this.queue = QUEUE;
    this.client = new _serviceBus.ServiceBusClient(this.url);
    //create admin subscriptions;
    if (TOPIC) {
      this.topic = TOPIC;
      this.subscriptionConfig = SUBSCRIPTION_CONFIG;
      this.adminClient = new _serviceBus.ServiceBusAdministrationClient(this.url);
      this.#setup();
    }
  }
  async #setup() {
    await this.adminClient.createTopic(this.topic);
    const params = [this.topic, this.subscriptionConfig?.name || this.defaultSubscription];
    this.subscriptionConfig?.filter && params.push(this.subscriptionConfig?.filter);
    await this.adminClient.createSubscription(...params);
  }
  async addToQueue({
    message
  }) {
    try {
      // sending a single message
      const sender = this.client.createSender(this.topic || this.queue);
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
      };
    } catch (err) {
      console.log(err);
      return {
        status: false,
        error: err
      };
    }
  }
  async receiveFromQueue({
    handler,
    errorHandler
  }) {
    if (typeof handler !== "function") {
      throw new Error('handler must be a function');
    }
    if (typeof errorHandler !== "function") {
      throw new Error('error handler must be a function');
    }
    const params = [this.topic || this.queue];
    this.topic && params.push(this.subscriptionConfig?.name || this.defaultSubscription);
    const receiver = this.client.createReceiver(...params);
    receiver.subscribe({
      processMessage: handler(receiver),
      processError: errorHandler(receiver)
    });
  }
}
var _default = MessageQueue;
exports.default = _default;