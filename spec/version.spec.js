var copilot = require('../lib');

describe("Version", function() {

  it("should be correct", function() {
    expect(copilot.version).toBe(require('../package').version);
  });
});
