var RealEstate = artifacts.require("./RealEstate.sol");

module.exports = function(deployer) {
  deployer.deploy(RealEstate, "0x67043c26df93b3f25af0dd9753447aec643e0246");
};

