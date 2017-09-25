// client-side js
// run by the browser each time your view template is loaded

// by default, you've got jQuery,
// add other scripts at the bottom of index.html


$(function() {
  console.log('hello world :o');

  $('form').submit(function(event) {
    event.preventDefault();
    var slug = $('#slugInput').val();
    var username = $('#usernameInput').val()
    console.log(slug);
    
  
    $.post('/update', {slug: "duodeutsch", username: username },  function(data) {
      console.log(data)
      $('input').val('');
      $('input').focus();
    });
  });
});
