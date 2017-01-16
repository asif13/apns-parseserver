
Parse.Cloud.define('hello', function(req, res) {
  res.success('Hi');
});


Parse.Push.send({  channels: ['global'],

  data: {
    alert: "Broadcast to everyone"
  }
}, {
  success: function() {
    console.log("push success")
  },
  error: function(error) {
        console.log("push failed : "+error)

  },  useMasterKey: true

});