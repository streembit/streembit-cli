const cloudflare = require("./cloudflare");
const aws = require("./aws");
function providersArray() {
  return { cloudflare, aws };
}
module.exports = {
  cloudflare,
  aws,
};
