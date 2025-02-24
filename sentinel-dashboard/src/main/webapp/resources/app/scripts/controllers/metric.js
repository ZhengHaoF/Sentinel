var app = angular.module('sentinelDashboardApp');

app.controller('MetricCtl', ['$scope', '$stateParams', 'MetricService', '$interval', '$timeout','ngDialog',
  function ($scope, $stateParams, MetricService, $interval, $timeout,ngDialog) {
    //非实时查询条件
    $scope.query_endTime = new Date();
    $scope.query_startTime = new Date(new Date() - 5*60*1000);

    $scope.realtime_query = true;
    $("[name='my-checkbox']").bootstrapSwitch('state', $scope.realtime_query); //实时查询开启
    $('input[name="my-checkbox"]').on('switchChange.bootstrapSwitch', function(event, state) {
      // console.log(this); // DOM element
      // console.log(event); // jQuery event
      // console.log(state); // true | false
      $scope.realtime_query = state;
      if(state == false){
        $interval.cancel(intervalId);
        //实时监控转非实时监控的时候不进行查询
        // queryIdentityDatas();
      }
      if(state == true){
        reInitIdentityDatas();
      }

    });

    //时间change事件
    $scope.timechange = function(type){
      var diff = $scope.query_endTime - $scope.query_startTime;
      if(type === 'start'){
        设定endtime
        if(diff > 60*60*1000){
          $scope.query_endTime = new Date(($scope.query_startTime).getTime() + 30*60*1000);
        }
        if(diff <= 0){
          $scope.query_endTime = new Date(($scope.query_startTime).getTime() + 30*60*1000)
        }



      }

      if(type === 'end'){
        // alert("666");
        //设定endtime
        // if(diff > 60*60*1000){
        //   $scope.query_startTime = new Date(($scope.query_endTime).getTime() - 30*60*1000);
        // }
        // if(diff <= 0){
        //   $scope.query_startTime = new Date(($scope.query_endTime).getTime() - 30*60*1000);
        // }

        //开始时间是结束时间往前五分钟
        $scope.query_startTime = new Date(($scope.query_endTime).getTime() - 5*60*1000);

      }

    };

    $scope.charts = [];
    $scope.endTime = new Date();
    $scope.startTime = new Date();
    $scope.startTime.setMinutes($scope.endTime.getMinutes() - 30);
    $scope.startTimeFmt = formatDate($scope.startTime);
    $scope.endTimeFmt = formatDate($scope.endTime);
    //向前按钮是否可用点击
    $scope.timeForwardBottonIsActive = false;
    function formatDate(date) {
      return moment(date).format('YYYY/MM/DD HH:mm:ss');
    }
    $scope.changeStartTime = function (startTime) {
      $scope.startTime = new Date(startTime);
      $scope.startTimeFmt = formatDate(startTime);
    };
    $scope.changeEndTime = function (endTime) {
      $scope.endTime = new Date(endTime);
      $scope.endTimeFmt = formatDate(endTime);
    };

    $scope.app = $stateParams.app;
    // 数据自动刷新频率
    var DATA_REFRESH_INTERVAL = 1000 * 10;

    $scope.servicePageConfig = {
      pageSize: 6,
      currentPageIndex: 1,
      totalPage: 1,
      totalCount: 0,
    };
    $scope.servicesChartConfigs = [];

    $scope.pageChanged = function (newPageNumber) {
      $scope.servicePageConfig.currentPageIndex = newPageNumber;
      if($scope.realtime_query == false){
        queryIdentityDatas();
      }
      if($scope.realtime_query == true){
        reInitIdentityDatas();
      }
    };

    var searchT;
    $scope.searchService = function () {
      $timeout.cancel(searchT);
      searchT = $timeout(function () {
        reInitIdentityDatas();
      }, 600);
    }

    var intervalId;
    reInitIdentityDatas();
    function reInitIdentityDatas() {
      $interval.cancel(intervalId);
      queryIdentityDatas();
      intervalId = $interval(function () {
        queryIdentityDatas();
      }, DATA_REFRESH_INTERVAL);
    };

    //非实时查询
    $scope.ontimeSearch = function(){

      queryIdentityDatas();
    };



    //点击向后
    $scope.timeBackward = function (){
      //结束时间增加5分钟
      $scope.query_endTime = new Date(($scope.query_endTime).getTime() - 5*60*1000);
      $scope.query_startTime = new Date(($scope.query_startTime).getTime() - 5*60*1000);


      if($scope.query_startTime > new Date(new Date().getTime() - 5*60*1000)){
        $scope.timeForwardBottonIsActive = false;
      }else {
        $scope.timeForwardBottonIsActive = true;
      }
      //点击向前/向后不需要查询，因为改变事件的事件会自动触发查询
      // $scope.ontimeSearch();
    };

    //点击向前
    $scope.timeForward = function (){
      //结束时间减少五分钟
      $scope.query_endTime = new Date(($scope.query_endTime).getTime() + 5*60*1000);
      $scope.query_startTime = new Date(($scope.query_startTime).getTime() + 5*60*1000);

      //如果向后的时间超出此刻，则把时间设置为此刻
      if($scope.query_endTime > new Date()){
        $scope.query_endTime = new Date();
        $scope.timeForwardBottonIsActive = false;
      }

      if($scope.query_startTime > new Date(new Date().getTime() - 5*60*1000)){
        $scope.timeForwardBottonIsActive = false;
      }else {
        $scope.timeForwardBottonIsActive = true;
      }
      //点击向前/向后不需要查询，因为改变事件的事件会自动触发查询
      // $scope.ontimeSearch();
    };

    //监听时间改变
    $scope.$watch('query_endTime', function (newVal, oldVal) {
      if (newVal !== oldVal) {
        $scope.query_endTime = newVal;
        $scope.query_startTime = new Date(new Date($scope.query_endTime).getTime() - (5 * 60 * 1000));
        $scope.ontimeSearch();
      }
    }, true);


    $scope.$on('$destroy', function () {
      $interval.cancel(intervalId);
    });
    $scope.initAllChart = function () {
      //revoke useless charts positively
      while($scope.charts.length > 0) {
        let chart = $scope.charts.pop();
        chart.destroy();
      }
      $.each($scope.metrics, function (idx, metric) {
        if (idx == $scope.metrics.length - 1) {
          return;
        }
        const chart = new G2.Chart({
          container: 'chart' + idx,
          forceFit: true,
          width: 100,
          height: 250,
          padding: [10, 30, 70, 50]
        });

        $scope.charts.push(chart);
        var maxQps = 0;
        for (var i in metric.data) {
          var item = metric.data[i];
          if (item.passQps > maxQps) {
            maxQps = item.passQps;
          }
          if (item.blockQps > maxQps) {
            maxQps = item.blockQps;
          }
          //添加一条直线的平均值
          item.avg = Number(metric.avg);
        }


        //把内容添加进图表
        chart.source(metric.data);


        chart.scale('timestamp', {
          type: 'time',
          mask: 'YYYY-MM-DD HH:mm:ss'
        });
        
        

        chart.scale('passQps', {
          min: 0,
          max: maxQps,
          fine: true,
          alias: '通过 QPS'
          // max: 10
        });
        chart.scale('blockQps', {
          min: 0,
          max: maxQps,
          fine: true,
          alias: '拒绝 QPS',
        });
        chart.scale('avg', {
          min: 0,
          max: maxQps,
          fine: true,
          alias: '平均 QPS'
        });

        chart.scale('rt', {
          min: 0,
          fine: true,
        });

        chart.axis('rt', {
          grid: null,
          label: null
        });

        chart.axis('blockQps', {
          grid: null,
          label: null
        });
        chart.axis('avg', {
          grid: null,
          label: null
        });

        chart.axis('timestamp', {
          label: {
            textStyle: {
              textAlign: 'center', // 文本对齐方向，可取值为： start center end
              fill: '#404040', // 文本的颜色
              fontSize: '11', // 文本大小
              //textBaseline: 'top', // 文本基准线，可取 top middle bottom，默认为middle
            },
            autoRotate: false,
            formatter: function (text, item, index) {
              return text.substring(11, 11 + 5);
            }
          }
        });

        chart.legend({
          custom: true,
          position: 'bottom',
          allowAllCanceled: true,
          itemFormatter: function (val) {
            if ('passQps' === val) {
              return '通过 QPS';
            }
            if ('blockQps' === val) {
              return '拒绝 QPS';
            }
            if ('avg' === val) {
              return '平均 QPS';
            }
            return val;
          },
          items: [
            { value: 'passQps', marker: { symbol: 'hyphen', stroke: 'green', radius: 5, lineWidth: 2 } },
            { value: 'blockQps', marker: { symbol: 'hyphen', stroke: 'blue', radius: 5, lineWidth: 2 } },
            { value: 'avg', marker: { symbol: 'hyphen', stroke: 'red', radius: 5, lineWidth: 2 } },
            // { value: 'rt', marker: {symbol: 'hyphen', stroke: 'gray', radius: 5, lineWidth: 2} },
          ],
          onClick: function (ev) {
            const item = ev.item;
            const value = item.value;
            const checked = ev.checked;
            const geoms = chart.getAllGeoms();
            for (var i = 0; i < geoms.length; i++) {
              const geom = geoms[i];
              if (geom.getYScale().field === value) {
                if (checked) {
                  geom.show();
                } else {
                  geom.hide();
                }
              }
            }
          }
        });
        chart.line().position('timestamp*passQps').size(1).color('green').shape('smooth');
        chart.line().position('timestamp*blockQps').size(1).color('blue').shape('smooth');
        chart.line().position('timestamp*avg').size(1).color('red').shape('smooth');
        // chart.line().position('timestamp*rt').size(1).color('gray').shape('smooth');
        G2.track(false);
        chart.render();
      });
    };

    $scope.metrics = [];
    $scope.emptyObjs = [];
    function queryIdentityDatas() {
      var params = {
        app: $scope.app,
        pageIndex: $scope.servicePageConfig.currentPageIndex,
        pageSize: $scope.servicePageConfig.pageSize,
        desc: $scope.isDescOrder,
        searchKey: $scope.serviceQuery,
        startTime: $scope.realtime_query == false ? new Date($scope.query_startTime).getTime() : "",
        endTime: $scope.realtime_query == false ? new Date($scope.query_endTime).getTime() : "",
      };
      MetricService.queryAppSortedIdentities(params).success(function (data) {
        $scope.metrics = [];
        $scope.emptyObjs = [];
        if (data.code === 0 && data.data) {
          var metricsObj = data.data.metric;
          var identityNames = Object.keys(metricsObj);

          if (identityNames.length < 1) {
            $scope.emptyServices = true;
          } else {
            $scope.emptyServices = false;
          }
          $scope.servicePageConfig.totalPage = data.data.totalPage;
          $scope.servicePageConfig.pageSize = data.data.pageSize;
          var totalCount = data.data.totalCount;
          $scope.servicePageConfig.totalCount = totalCount;
          for (i = 0; i < totalCount; i++) {
            $scope.emptyObjs.push({});
          }
          $.each(identityNames, function (idx, identityName) {
            var identityDatas = metricsObj[identityName];
            var metrics = {};
            metrics.resource = identityName;
            // metrics.data = identityDatas;

            let avg
            if(identityDatas.length == 0){
              avg = 0
            }
            else{
              let sum = identityDatas.reduce((a, b)=>{
                return a + b.passQps
              }, 0)
              // console.log(sum)
              avg = (sum / identityDatas.length).toFixed(2)
            }
            
            metrics.data = fillZeros(identityDatas);
            metrics.avg = avg;
            // console.log(metrics.data)
            metrics.shortData = lastOfArray(identityDatas, 6);
            $scope.metrics.push(metrics);
          });




          // push an empty element in the last, for ng-init reasons.
          $scope.metrics.push([]);


          // $scope.metrics[0]['data'].push({
          //   "id": null,
          //   "app": "adbjr.xms.foxhis.com",
          //   "timestamp": 1660550400000,
          //   "gmtCreate": 1660550586000,
          //   "resource": "MOD",
          //   "passQps": 2,
          //   "blockQps": 0,
          //   "successQps": 0,
          //   "exceptionQps": 0,
          //   "rt": 97,
          //   "count": 1,
          //   "$$hashKey": "object:3925"
          // })

        } else {
          ngDialog.closeAll();
          $scope.emptyServices = true;
          //错误提醒
          ngDialog.open({ template: '<p>提示</p><span>'+data.msg+'</span>',plain:true });
        }
      });
    };
    function fillZeros(metricData) {
      if (!metricData || metricData.length == 0) {
        return [];
      }
      var filledData = [];
      filledData.push(metricData[0]);
      var lastTime = metricData[0].timestamp / 1000;
      for (var i = 1; i < metricData.length; i++) {
        var curTime = metricData[i].timestamp / 1000;
        if (curTime > lastTime + 1) {
          for (var j = lastTime + 1; j < curTime; j++) {
            filledData.push({
              "timestamp": j * 1000,
              "passQps": 0,
              "blockQps": 0,
              "successQps": 0,
              "exception": 0,
              "rt": 0,
              "count": 0,
              "avg": 0
            })
          }
        }
        filledData.push(metricData[i]);
        lastTime = curTime;
      }
      return filledData;
    }
    function lastOfArray(arr, n) {
      if (!arr.length) {
        return [];
      }
      var rs = [];
      for (i = 0; i < n && i < arr.length; i++) {
        rs.push(arr[arr.length - 1 - i]);
      }
      return rs;
    }

    $scope.isDescOrder = true;
    $scope.setDescOrder = function () {
      $scope.isDescOrder = true;
      if($scope.realtime_query == false){
        queryIdentityDatas();
      }
      if($scope.realtime_query == true){
        reInitIdentityDatas();
      }
    }
    $scope.setAscOrder = function () {
      $scope.isDescOrder = false;
      if($scope.realtime_query == false){
        queryIdentityDatas();
      }
      if($scope.realtime_query == true){
        reInitIdentityDatas();
      }
    }
  }]);
