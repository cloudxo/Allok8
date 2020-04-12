const cmd = require('node-cmd');

const k8 = {};

k8.getNodeInfo = (req, res, next) => {
  console.log("node")
  // todo switch from body to using cookies, I think
  const { api, token } = req.body;
  cmd.get(
    `curl https://${api}/api/v1/nodes?limit=500 --header "Authorization: Bearer ${token}" --insecure`,
    (err, data, stderr) => {
      // error handle if needed
      if (err) {
        return next(err);
      }
      const obj = JSON.parse(data);
      const numOfNodes = obj.items.length;
      const nodeNameArray = [];
      const nodeMetricsRaw = {};
      // loop through nodes
      obj.items.forEach((item) => {
        // and add each node to an array
        console.log(nodeNameArray);
        console.log(typeof nodeNameArray)
        console.log(item.metadata.name);
        if (nodeNameArray !== undefined) {
          nodeNameArray.push(item.metadata.name);
        }
        
        // keep track of each nodes usage metrics in an object
        nodeMetricsRaw[item.metadata.name] = item.status;
      });
      res.locals.nodeInfo = {
        nodeNameArray,
        nodeMetricsRaw,
      };

      return next();
    },
  );
};


k8.getPodInfo = (req, res, next) => {
  console.log("pod info")
  // todo switch from body to using cookies, I think
  const { api, token } = req.body;
  //! hard coded for now
  const namespace = 'default';
  cmd.get(
    `curl https://${api}/api/v1/namespaces/${namespace}/pods?limit=500 --header "Authorization: Bearer ${token}" --insecure`,
    (err, data, stderr) => {
      // error handle if needed
      if (err) {
        return next(err);
      }
      const obj = JSON.parse(data);
      const podNameArray = [];
      const podInfo = {};
      // todo swap this to use object.keys to iterate instead of a for in


      for (const i in obj.items)
      // make sure pod is on current node
      {
        if (obj.items[i].metadata.namespace === `${namespace}`) {
        // push to an array of pod names
          podNameArray.push(obj.items[i].metadata.name);
          // keep track of each pod in an object
          podInfo[obj.items[i].metadata.name] = obj.items[i];
        }
      }
   
      res.locals.podsInfo = {
        podInfo,
        podNameArray,
      };

      return next();
    },
  );
};

k8.getNodesUsage = (req, res, next) => {
  console.log("nodes")
  // todo switch from body to using cookies, I think
  const { api, token } = req.body;
  //! hard coded for now
  cmd.get(
    `curl https://${api}/apis/metrics.k8s.io/v1beta1/nodes --header "Authorization: Bearer ${token}" --insecure`,
    (err, data, stderr) => {
      // error handle if needed
      if (err) {
        return next(err);
      }

      res.locals.nodeUsage = JSON.parse(data);


      return next();
    },
  );
};

k8.getPodsUsage = (req, res, next) => {
  console.log("pods")
  // todo switch from body to using cookies, I think
  const { api, token } = req.body;
  //! hard coded for now
  const namespace = 'default';
  cmd.get(
    `curl https://${api}/apis/metrics.k8s.io/v1beta1/namespaces/${namespace}/pods --header "Authorization: Bearer ${token}" --insecure`,
    (err, data, stderr) => {
      // error handle if needed
      if (err) {
        return next(err);
      }
      res.locals.podUsage = JSON.parse(data);


      return next();
    },
  );
};

k8.structureData = (req, res, next) => {
  const { podUsage, nodeUsage, podsInfo, nodeInfo } = res.locals;
  console.log(nodeInfo);
  Object.keys(nodeInfo.nodeMetricsRaw).forEach(nodeName => {
    console.log(nodeName);
    console.log(nodeUsage);
    nodeUsage.items.forEach(eachNode => {
      console.log(eachNode);
      if (eachNode.metadata.name === nodeName) {
        nodeInfo.nodeMetricsRaw[nodeName]['nodeUsage'] = eachNode
        nodeInfo.nodeMetricsRaw[nodeName]['pods'] = [];
      }
    })
    if (nodeUsage.items.length === 0) {
      nodeInfo.nodeMetricsRaw[nodeName]['pods'] = [];
    }


    Object.keys(podsInfo.podInfo).forEach(podName => {
      const currNodeName = podsInfo.podInfo[podName].spec.nodeName;

      podUsage.items.forEach(eachPod => {

        if (eachPod.metadata.name === podName) {
          podsInfo.podInfo[podName]['podUsage'] = eachPod
        }
      })

      if (nodeName === currNodeName) {
        console.log("here")
        console.log(nodeInfo.nodeMetricsRaw[nodeName]['pods']);
        nodeInfo.nodeMetricsRaw[nodeName]['pods'].push(podsInfo.podInfo[podName]);
      }
    
  })
  })
  return next()
}


module.exports = k8;
