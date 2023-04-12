// Require AngularJS and shared components.
require(['angular', 'components/shared/index'], (angular) => {
  // Initialize the AngularJS app and import the PowerSchool module.
  const app = angular.module('METAReferenceApp', ['powerSchoolModule']);

  // Create the main controller for the app.
  app.controller("METAReferenceCtrl", ($scope, $http, $sce, $timeout) => {
      // Define sections of data to be loaded.
      $scope.sections = ['student_info', 'school_info', 'other', 'contacts', 'prefs', 'pq_dat', 'if', 'misc', 'eval', 'eval_text', 'eval_logic', 'insert', 'giv', 'server', 'op_char', 'op_date', 'date_info', 'op_time', 'op_decimal', 'page', 'frn', 'gpa', 'rank', 'honorroll', 'att', 'daily_att', 'period', 'grades', 'std', 'tests', 'logic_if', 'decode', 'case', 'functions', 'tlist_sql', 'duplicate', 'counselors'];

      // Initialize the local variables.
      $scope.student = {};
      $scope.newVersion = false;
      $scope.newTagCount = { "count": 0 };

      // Load the current student's information.
      ~[tlist_sql;select dcid, lastfirst from students where id = ~(curstudid);]
        $scope.student.dcid = "~(dcid)";
        $scope.student.name = "~(lastfirst;json)";
      [/tlist_sql]
      
      // Get the total number of students.
      $scope.totalStudents = ~[tlist_sql;select count(1) from students]~(total)[/tlist_sql];

      // Fetch the new tag count from the external source.
      $http.get("https://apps2.metasolutions.net/dat/tags.php").then((json) => {
        $scope.newTagCount = json.data;
      });

      // Function to add a section and fetch its data.
      $scope.addSection = (section, idx) => {
          $http({
              method: 'GET'
              ,url: `tags/${section}.json?frn=001${$scope.student.dcid}`
              ,transformResponse: [(data) => {
                  data = data.replace(/\&#126;/g,"~").replace(/\r?\n|\r/g, '');

                  dataArr = data.split("<noquote>");
                  rtn = [];
                  for (let d in dataArr) {
                      dataArr2 = dataArr[d].split("</noquote>");
                      if (dataArr2[1]) {
                          rtn.push(dataArr2[0].replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('/', '&#47;').replaceAll('<&#47;', '</'));
                          rtn.push(dataArr2[1])
                      } else {
                          rtn.push(dataArr2[0])
                      }
                  }
                  data = rtn.join("");

                  dataArr = data.split("<notag>");
                  rtn = [];
                  for (let d in dataArr) {
                      dataArr2 = dataArr[d].split("</notag>");
                      if (dataArr2[1]) {
                          rtn.push(dataArr2[0].replaceAll('"', '\\"').replaceAll('<', '&lt;').replaceAll('/', '&#47;'));
                          rtn.push(dataArr2[1])
                      } else {
                          rtn.push(dataArr2[0])
                      }
                  }
                  data = rtn.join("");
                  
                  return JSON.parse(data);
                }]
              }).then(function success(json) {
                let sectionJSON = json.data;
                for (tag_idx in sectionJSON[0].tags) {
                  let tag = sectionJSON[0].tags[tag_idx];
                  $scope.tagCount++;

                  if (!tag.code) tag.code = tag.disp;
                  tag.code = `<code>${tag.code}</code>`;
                  tag.orig_disp = tag.disp;
                  if (tag.disp) tag.disp = tag.disp.replaceAll(";",";<break> </break>");
                  tag.orig_code = tag.code;
                  if (tag.code) tag.code = tag.code.replaceAll(";",";<break> </break>");
                  if (tag.code) tag.code = tag.code.replaceAll("]","]<break> </break>");
                  tag.orig_ex = tag.ex;
                  if (tag.ex) tag.ex = tag.ex.replaceAll("</","!lt!");
                  if (tag.ex) tag.ex = tag.ex.replaceAll("/","/<break> </break>");
                  if (tag.ex) tag.ex = tag.ex.replaceAll("!lt!","</");
                  tag.section = sectionJSON[0].section;
                  tag.description = sectionJSON[0].description;
                };
                $scope.data[idx] = sectionJSON[0];
                $scope.loadingMsg = `Loading DAT Sections [${$scope.sectionCounter}/${$scope.sections.length}]`;
                if (++$scope.sectionCounter == $scope.sections.length) {
                  if ($scope.tagCount < $scope.newTagCount.count) { $scope.newVersion = true; } else { $scope.newVersion = false; }
                  $scope.loading = false;
                }
              }, function error(json) {
              // this function will be called when the request returned error status
                console.log(section, "error", json)
                if (++$scope.sectionCounter == $scope.sections.length) {
                  if ($scope.tagCount < $scope.newTagCount.count) { $scope.newVersion = true; } else { $scope.newVersion = false; }
                  $scope.loading = false;
                }

          });
      }
      
      // Function to refresh the student data.
      $scope.refreshStudent = () => {
          $scope.loading = true;
          $scope.tagCount = 0;
          $scope.sectionCounter = 0;
          $scope.data = [];
          $scope.sections.forEach((section, idx) => $scope.addSection(section, idx));
      };

      // Function to set the filter to a specific section.
      $scope.setSection = (section) => {
          $scope.filter = section.section;
      }
      
      // Function to copy a tag to the clipboard.
      $scope.copyTag = (tag) => {
          let d = tag.disp.replaceAll("<break> </break>","");
          var promise = navigator.clipboard.writeText(d);
          $scope.data.copiedText = true;
          $timeout(() => {$scope.data.copiedText = false}, 1500);
      }
      
      // Function to load a random student.
      $scope.randStudent = () => {
          $scope.loadingMsg = "Choosing Random Student...";
          let nd = Math.floor(Math.random() * $scope.totalStudents) + 1;
          $http.get(`rand.json.html?nd=${nd}`).then((json) => {
            $scope.student = json.data;
            $scope.refreshStudent();
          });
      }

      // Function to trust input as HTML.
      $scope.trustAsHtml = (html) => { return $sce.trustAsHtml(html); }
      
      // Function to highlight the search term in the text.
      $scope.highlight = (text, search) => {
          search = ""; /* Temporarily removing seach term, which was causing invalid syntax highlighting */
          if (!text) return null;
          if (!search) return $sce.trustAsHtml(text);
          search = search.replaceAll(".","\\.");
          return $sce.trustAsHtml(unescape(escape(text)).replace(new RegExp(search, 'gi'), '<span class="highlightedText">$&</span>'));
      };

      // Refresh student data or load a random student when the page loads.
      if ($scope.student.dcid) {
          $scope.refreshStudent();
      } else {
          $scope.randStudent();
      }
  });
});
