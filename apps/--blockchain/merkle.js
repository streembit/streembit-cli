import crypto from "crypto";
import through from "through";

const GdcMerkle = (hashFunc) => {
  const that = this;

  const resFunc = () => {
    return root();
  };

  that.leaves = [];
  that.treeDepth = 0;
  that.rows = [];
  that.nodesCount = 0;

  const feed = (anyData) => {
    if (anyData && anyData.match(/^[\w\d]{40}$/)) {
      that.leaves.push(anyData.toLowerCase());
    } else {
      that.leaves.push(hashFunc(anyData).toLowerCase());
    }
    return that;
  };

  const depth = () => {
    // Compute tree depth
    if (!that.treeDepth) {
      let pow = 0;
      while (Math.pow(2, pow) < that.leaves.length) {
        pow++;
      }
      that.treeDepth = pow;
    }
    return that.treeDepth;
  };

  const levels = () => {
    return depth() + 1;
  };

  const nodes = () => {
    return that.nodesCount;
  };

  const root = () => {
    return that.rows[0][0];
  };

  const level = (i) => {
    return that.rows[i];
  }

  const compute = () => {
    const theDepth = depth();
    if (that.rows.length == 0) {
      // Compute the nodes of each level
      for (let i = 0; i < theDepth; i++) {
        that.rows.push([]);
      }
      that.rows[theDepth] = that.leaves;
      for (let j = theDepth - 1; j >= 0; j--) {
        that.rows[j] = getNodes(that.rows[j + 1]);
        that.nodesCount += that.rows[j].length;
      }
    }
  }

  const getNodes = (leaves) => {
    const remainder = leaves.length % 2;
    let nodes = [];
    for (let i = 0; i < leaves.length - 1; i = i + 2) {
      nodes[i / 2] = hashFunc(leaves[i] + leaves[i + 1]).toLowerCase();
    }
    if (remainder === 1) {
      nodes[(leaves.length - remainder) / 2] = leaves[leaves.length - 1];
    }
    return nodes;
  }

  // PUBLIC

  /**
   * Return the stream, with resulting stream begin root hash string.
   **/
  const stream = through(
    write = (data) => {
      feed("" + data);
    },
    end = () => {
      compute();
      this.emit("data", resFunc());
      this.emit("end");
    }
  );

  /**
   * Return the stream, but resulting stream will be json.
   **/
  stream.json = () => {
    resFunc = () => {
      return {
        root: root,
        level: level,
        depth: depth,
        levels: levels,
        nodes: nodes,
      };
    };
    return this;
  };

  /**
   * Computes merkle tree synchronously, returning json result.
   **/
  stream.sync = (leaves) => {
    leaves.forEach((leaf) => {
      feed(leaf);
    });
    compute();
    stream.json();
    return resFunc();
  };

  /**
   * Computes merkle tree asynchronously, returning json as callback result.
   **/
  stream.async = (leaves, done) => {
    leaves.forEach((leaf) => {
      feed(leaf);
    });
    compute();
    stream.json();
    done(null, resFunc());
  };

  return stream;
};

export default (hashFuncName) => {
  return new GdcMerkle(function (input) {
    if (hashFuncName === "none") {
      return input;
    } else {
      const hash = crypto.createHash(hashFuncName);
      return hash.update(input).digest("hex");
    }
  });
};
