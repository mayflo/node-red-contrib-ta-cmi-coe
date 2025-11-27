const dgram = require("dgram");

describe("UDP Integration mit Mock", () => {
  let server;
  let received;

  beforeAll(() => {
    return new Promise((resolve) => {
      server = dgram.createSocket("udp4");
      server.on("listening", resolve);
      server.on("message", (msg) => {
        received = msg.toString();
      });
      server.bind(5555); // besser eigenen Test-Port nehmen
    });
  });

  afterAll(() => {
    server.close();
  });

  test("Sendet Testpaket", () => {
    return new Promise((resolve, reject) => {
      const client = dgram.createSocket("udp4");
      const payload = Buffer.from("Hallo UDP-Mock!");

      client.send(payload, 5555, "127.0.0.1", (err) => {
        if (err) {
          client.close();
          return reject(err);
        }
        client.close();
      });

      setTimeout(() => {
        try {
          expect(received).toBe("Hallo UDP-Mock!");
          resolve();
        } catch (e) {
          reject(e);
        }
      }, 200);
    });
  });
});

