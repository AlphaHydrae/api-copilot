describe("Version", function() {

  var version = require('../lib').version;

  it("should be correct", function() {
    expect(version).toBe(require('../package').version);
  });
});
