$(document).ready(function() {
    var items;
    $.post("/search", {limit: 10, following: false} ,function(data){
	items = data.items;

	var newTweet = document.createElement('button');
	newTweet.setAttribute('id', 'one');
        console.log(items[0].content);
        $('#tweets').append(newTweet);
        $('#one').html('' + items[0].username + ': ' + items[0].content);
	$('#tweets').append('<br/>');
	$('#tweets').append('<br/>');
	$('#tweets').append('<br/>');
	$('#tweets').append('<br/>');
	$('#tweets').append('<br/>');
	$('#one').prop('disabled', true);

        newTweet = document.createElement('button');
        newTweet.setAttribute('id', 'two');
        console.log(items[1].content);
        $('#tweets').append(newTweet);
        $('#two').html('' + items[1].username + ': ' + items[1].content);
	$('#tweets').append('<br/>');
	$('#tweets').append('<br/>');
	$('#tweets').append('<br/>');
	$('#tweets').append('<br/>');
	$('#tweets').append('<br/>');
	$('#tweets').append('<br/>');
	$('#two').prop('disabled', true);

        newTweet = document.createElement('button');
        newTweet.setAttribute('id', 'three');
        console.log(items[2].content);
        $('#tweets').append(newTweet);
        $('#three').html('' + items[2].username + ': ' + items[2].content);
	$('#tweets').append('<br/>');
	$('#tweets').append('<br/>');
	$('#tweets').append('<br/>');
	$('#tweets').append('<br/>');
	$('#tweets').append('<br/>');
    	$('#three').prop('disabled', true);
	
        newTweet = document.createElement('button');
        newTweet.setAttribute('id', 'four');
        console.log(items[3].content);
        $('#tweets').append(newTweet);
        $('#four').html('' + items[3].username + ': ' + items[3].content);
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#four').prop('disabled', true);	

        newTweet = document.createElement('button');
        newTweet.setAttribute('id', 'five');
        console.log(items[4].content);
        $('#tweets').append(newTweet);
        $('#five').html('' + items[4].username + ': ' + items[4].content);
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#five').prop('disabled', true);

        newTweet = document.createElement('button');
        newTweet.setAttribute('id', 'six');
        console.log(items[5].content);
        $('#tweets').append(newTweet);
        $('#six').html('' + items[5].username + ': ' + items[5].content);
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#six').prop('disabled', true);

        newTweet = document.createElement('button');
        newTweet.setAttribute('id', 'seven');
        console.log(items[6].content);
        $('#tweets').append(newTweet);
        $('#seven').html('' + items[6].username + ': ' + items[6].content);
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#seven').prop('disabled', true);

        newTweet = document.createElement('button');
        newTweet.setAttribute('id', 'eight');
        console.log(items[7].content);
        $('#tweets').append(newTweet);
        $('#eight').html('' + items[7].username + ': ' + items[7].content);
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#eight').prop('disabled', true);

        newTweet = document.createElement('button');
        newTweet.setAttribute('id', 'nine');
        console.log(items[8].content);
        $('#tweets').append(newTweet);
        $('#nine').html('' + items[8].username + ': ' + items[8].content);
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#nine').prop('disabled', true);

        newTweet = document.createElement('button');
        newTweet.setAttribute('id', 'ten');
        console.log(items[9].content);
        $('#tweets').append(newTweet);
        $('#ten').html('' + items[9].username + ': ' + items[9].content);
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#tweets').append('<br/>');
        $('#ten').prop('disabled', true);
});

});
