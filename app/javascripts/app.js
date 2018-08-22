// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/realestate.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

const ipfsAPI = require('ipfs-api');
const ipfs = ipfsAPI({host: 'localhost', port: '5001', protocol: 'http'});

// Import our contract artifacts and turn them into usable abstractions.
import realestate_store_artifacts from '../../build/contracts/RealEstate.json'

// MetaCoin is our usable abstraction, which we'll use through the code below.
var RealEstate = contract(realestate_store_artifacts);
var reader;

window.App = {
 start: function() {
  var self = this;

  // Bootstrap the MetaCoin abstraction for Use.
  RealEstate.setProvider(web3.currentProvider);
  if ($("#house-details").length > 0) {
    let houseId = new URLSearchParams(window.location.search).get('id');
    renderHouseDetails(houseId);
  } else {
    renderStore();
  }

  $("#house-image").change(function(event) {
    const file = event.target.files[0];
    reader = new window.FileReader()
    reader.readAsArrayBuffer(file) 
  });

  $("#add-item-to-store").submit(function(event) {
    const req = $("#add-item-to-store").serialize();
    let params = JSON.parse('{"' + req.replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}');
    let decodedParams = {}
    Object.keys(params).forEach(function(v){
      decodedParams[v] = decodeURIComponent(decodeURI(params[v]));
    });
    console.log(decodedParams);
    saveHouse(decodedParams);
    event.preventDefault();
  });

  $("#buy-now").submit(function(event) {
    $("#msg").hide();
    var sendAmount = $("#buy-now-price").val();
    var houseId = $("#house-id").val();
    RealEstate.deployed().then(function(i) {
      i.buy(houseId, {value: sendAmount, from: web3.eth.accounts[0], gas: 4700000}).then(function(f) {
        $("#msg").show();
        $("#msg").html("You have sucessfully purchased the house");
      })
    });
    event.preventDefault();
  });

  $("#release-funds").click(function(event) {
    let houseId = new URLSearchParams(window.location.search).get('id');
    RealEstate.deployed().then(function(f) {
      $("#msg").html("Your transaction has been submitted. Please wait for a few seconds for the confirmation").show();
      console.log(houseId);
      f.releaseAmountToSeller(houseId, {from: web3.eth.accounts[0]}).then(function(f) {
        console.log(f);
        location.reload();
      }).catch(function(e) {
        console.log(e);
      })
    });
  });

  $("#refund-funds").click(function(event) {
    let houseId = new URLSearchParams(window.location.search).get('id');
    RealEstate.deployed().then(function(f) {
      $("#msg").html("Your transaction has been submitted. Please wait for a few seconds for the confirmation").show();
      console.log(houseId);
      f.refundAmountToBuyer(houseId, {from: web3.eth.accounts[0]}).then(function(f) {
        console.log(f);
        location.reload();
      }).catch(function(e) {
        console.log(e);
      })
    });
  });

}
};

function renderHouseDetails(houseId) {
  RealEstate.deployed().then(function(f) {
    f.getHouse.call(houseId).then(function(p) {
      $("#house-name").html(p[1]);
      $("#house-image").html("<img width='100' src='http://ipfs.io/ipfs/" + p[3] + "' />");
      $("#house-price").html(displayPrice(p[6]));
      $("#house-id").val(p[0]);
      $("#buy-now-price").val(p[6]);
      ipfs.cat(p[4]).then(function(file) {
        var content = file.toString();
        $("#house-description").append("<div>" + content + "</div>");
      })
      if (p[8] === '0x0000000000000000000000000000000000000000') {
        $("#escrow-info").hide();
      } else {
        $("#buy-now").hide();
        f.escrowInfo.call(houseId).then(function(i) {
          $("#buyer").html(i[0]);
          $("#seller").html(i[1]);
          $("#arbiter").html(i[2]);
          $("#release-count").html(i[4].toNumber());
          $("#refund-count").html(i[5].toNumber());
        });
      }
    });
  })
}

function saveHouse(house) {
  var imageId;
  var descId;

  saveImageOnIpfs(reader).then(function(id) {
    imageId = id;
    saveTextBlobOnIpfs(house["house-description"]).then(function(id) {
      descId = id;
      RealEstate.deployed().then(function(f) {
        return f.addHouseToStore(house["house-name"], house["house-category"], imageId, descId, 
          Date.parse(house["house-start-time"]) / 1000, web3.toWei(house["house-price"], 'ether'), 
          house["house-condition"], {from: web3.eth.accounts[0], gas: 4700000});
      }).then(function(f) {
        alert("House added to the Marketplace!");
        location.reload();
      });
    });
  });
}

function saveImageOnIpfs(reader) {
  return new Promise(function(resolve, reject) {
    const buffer = Buffer.from(reader.result);
    ipfs.add(buffer)
    .then((response) => {
      console.log(response)
      resolve(response[0].hash);
    }).catch((err) => {
      console.error(err)
      reject(err);
    })
  })
}

function saveTextBlobOnIpfs(blob) {
  return new Promise(function(resolve, reject) {
    const descbuffer = Buffer.from(blob, 'utf-8');
    ipfs.add(descbuffer)
    .then((response) => {
      console.log(response)
      resolve(response[0].hash);
    }).catch((err) => {
      console.error(err)
      reject(err);
    })
  })
}

function renderStore() {
  var instance;
  return RealEstate.deployed().then(function(f) {
    instance = f;
    return instance.houseIndex.call();
  }).then(function(count) {
    for (var i = 1; i <= count; i++) {
      renderHouse(instance, i);
    }
  });
}

function renderHouse(instance, index) {
  instance.getHouse.call(index).then(function(f) {
    let node = $("<div/>");
    console.log(f);
    node.addClass("col-sm-3 text-center col-margin-bottom-1 house");
    node.append("<img width='100' src='http://ipfs.io/ipfs/" + f[3] + "' />");
    node.append("<div class='title'>" + f[1] + "</div>");
    node.append("<div> Price: " + displayPrice(f[6]) + "</div>");
    node.append("<a href='house.html?id=" + f[0] + "'>Details</div>");
    if (f[8] === '0x0000000000000000000000000000000000000000') {
      $("#house-list").append(node);
    } else {
      $("#house-purchased").append(node);
    }
  });
}

function displayPrice(amt) {
  return "&Xi;" + web3.fromWei(amt, 'ether');
}

window.addEventListener('load', function() {
 // Checking if Web3 has been injected by the browser (Mist/MetaMask)
 if (typeof web3 !== 'undefined') {
  console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
  // Use Mist/MetaMask's provider
  window.web3 = new Web3(web3.currentProvider);
} else {
  console.warn("No web3 detected. Falling back to http://127.0.0.1:9545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
  // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
  window.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"));
}

App.start();
});
