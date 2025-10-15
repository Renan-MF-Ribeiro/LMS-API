class CommandQueue {
    static instance;
    #queue = [];
    #isProcessing = false;

    constructor() {
        if (!CommandQueue.instance) {
            CommandQueue.instance = this;
        }
        return CommandQueue.instance;
    }

    async enqueue(command) {
        return new Promise((resolve, reject) => {
            this.#queue.push({ command, resolve, reject });
            this.#process();
        });
    }

    async #process() {
        if (this.#isProcessing || this.#queue.length === 0) {
            return;
        }

        this.#isProcessing = true;

        const { command, resolve, reject } = this.#queue.shift();

        try {
            const result = await command();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.#isProcessing = false;
            this.#process();
        }
    }

    clear() {
        this.#queue = [];
    }
}

module.exports = new CommandQueue();

