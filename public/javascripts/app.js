angular.module('MainApp', [])
    .controller('MainCtrl', [
        '$scope',
        '$http',
        function($scope, $http){

            $scope.question = '';
            $scope.answer = '';
            $scope.name = '';
            $scope.picUrl = '';
            $scope.formVisible = false;
            $scope.formVisible = true;
            $scope.players = [];
            $scope.choices = ['none', 'none', 'none', 'none'];
            $scope.buttonPressed = false;
            $scope.lastCorrectAnswer = '';

            $scope.addUser = function(firstName, image, id) {
                console.log("firstName is: " + firstName);

                $http({
                    url: "/addPlayer",
                    method: "POST",
                    data: {"name": firstName, "imgUrl": image, "id": id}
                }).then(function successCallback(response) {
                    $scope.name = firstName;
                    $scope.id = id;
                    $scope.formVisible = false;
                    $scope.nameVisible = true;
                }, function errorCallback(response) {

                });

            };

            $scope.getScores = function() {
                if (!$scope.name) {
                    return;
                }
                $http({
                    url: "/scores/?n=" + $scope.name,
                    method: "GET"
                }).then(function successCallback(response) {
                    console.log(response);

                    if (response.data.lastCorrectAnswer) {
                        $scope.lastCorrectAnswer = response.data.lastCorrectAnswer;
                    }

                    $scope.players = response.data.scores;
                }, function errorCallback(response) {

                });
            };

            $scope.getCurrentQuestion = function() {
                if (!$scope.name) {
                    return;
                }
                $http({
                    url: "/getQuestion",
                    method: "GET"
                }).then(function successCallback(response) {

                    if (response.data.waiting) {
                        $scope.question = 'Next Question Upcoming';
                        $scope.choices[0] = '-';
                        $scope.choices[1] = '-';
                        $scope.choices[2] = '-';
                        $scope.choices[3] = '-';

                        return;
                    }

                    var fourChoices = response.data.wrongChoices;

                    $scope.choices[0] = fourChoices[0];
                    $scope.choices[1] = fourChoices[1];
                    $scope.choices[2] = fourChoices[2];
                    $scope.choices[3] = fourChoices[3];

                    $scope.question = response.data.name;
                    $scope.answer = response.data.years;

                }, function errorCallback(response) {

                });
            };

            var enableButton = function() {
                $scope.buttonPressed = false;
            };

            $scope.submitAnswer = function(number) {

                if ($scope.question === 'Next Question Upcoming') {
                    return;
                }

                $scope.buttonPressed = true;

                if ($scope.choices[number] === $scope.answer) {
                    $http({
                        url: "/rightAnswer",
                        method: "POST",
                        data: {"id": $scope.id}
                    }).then(function successCallback(response) {
                        setTimeout(enableButton, 10);
                    }, function errorCallback(response) {
                        setTimeout(enableButton, 10);
                    });

                } else {
                    $http({
                        url: "/wrongAnswer",
                        method: "POST",
                        data: {"id": $scope.id}
                    }).then(function successCallback(response) {
                        setTimeout(enableButton, 10);

                    }, function errorCallback(response) {
                        setTimeout(enableButton, 10);
                    });
                }

            };

            $scope.isPlayer = function(name) {
              return (name === $scope.name)
            };

            $scope.isWaiting = function(){
                return ($scope.question !== 'Next Question Upcoming')
            };


            setInterval($scope.getScores, 250);
            setInterval($scope.getCurrentQuestion, 250);


            function isUserEqual(googleUser, firebaseUser) {
                if (firebaseUser) {
                    var providerData = firebaseUser.providerData;
                    for (var i = 0; i < providerData.length; i++) {
                        if (providerData[i].providerId === firebase.auth.GoogleAuthProvider.PROVIDER_ID &&
                            providerData[i].uid === googleUser.getBasicProfile().getId()) {
                            // We don't need to reauth the Firebase connection.
                            return true;
                        }
                    }
                }
                return false;
            }

            function onSignIn(googleUser) {
                //console.log("Name is: " + googleUser.getName());
                // We need to register an Observer on Firebase Auth to make sure auth is initialized.
                var unsubscribe = firebase.auth().onAuthStateChanged(function(firebaseUser) {
                    unsubscribe();
                    // Check if we are already signed-in Firebase with the correct user.
                    if (!isUserEqual(googleUser, firebaseUser)) {
                        // Build Firebase credential with the Google ID token.
                        var credential = firebase.auth.GoogleAuthProvider.credential(
                            googleUser.getAuthResponse().id_token);
                        // Sign in with credential from the Google user.
                        firebase.auth().signInWithCredential(credential).catch(function(error) {
                            // Handle Errors here.
                            var errorCode = error.code;
                            var errorMessage = error.message;
                            // The email of the user's account used.
                            var email = error.email;
                            // The firebase.auth.AuthCredential type that was used.
                            var credential = error.credential;
                            // ...
                        });
                    } else {
                        console.log('User already signed-in Firebase.');
                    }
                });


                var profile = googleUser.getBasicProfile();
                $scope.addUser(profile.getGivenName(), profile.getImageUrl(), profile.getId());
            }

            window.onSignIn = onSignIn;

            function signOut() {
                var auth2 = gapi.auth2.getAuthInstance();
                auth2.signOut();
                $http({
                    url: "/exit",
                    method: "POST",
                    data: {"id": $scope.id}
                }).then(function successCallback(response) {
                    $scope.name = '';
                    $scope.id = "";
                    $scope.formVisible = true;
                    $scope.nameVisible = false;
                }, function errorCallback(response) {

                });
            }

            window.signOut = signOut;

        }

    ]);
