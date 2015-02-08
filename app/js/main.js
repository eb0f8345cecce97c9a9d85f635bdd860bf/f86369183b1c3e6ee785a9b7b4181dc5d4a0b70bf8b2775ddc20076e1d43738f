var request = require('request');
var iconv = require('iconv');
var _ = require('underscore');
var gui = require('nw.gui');
var boardData = require('./js/boardData');


$(function() {
  // set up split bar
  $('div.split-pane').splitPane();

  //set up window controll buttons
  setWindowControllButtons();

  // scraping from bbs menu
  var url = 'http://www.2ch.net/bbsmenu.html';
  scrapBbsMenu(url, function() {
    setMenuEvent();
  });
});



function setWindowControllButtons() {
  var win = gui.Window.get();
  $('#win-close').on('click', function() {
    win.close();
  });

  $('#win-maximize').on('click', function() {
    if ($(this).hasClass('maximized')) {
      win.maximize();
    } else {
      win.unmaximize();
    }
    $(this).toggleClass('maximized');
  });

  $('#win-minimize').on('click', function() {
    win.minimize();
  });
}


function scrapBbsMenu(url, done) {
  featchBody(url, function(body) {
    body = body.replace(/\/>/g,'/ >');

    var boards = [];
    var number = 0;

    $(body).find('form:first').nextAll('a').each(function() {
      boards.push({
        category: $(this).prevAll('b:first').text(),
        href: $(this).attr('href'),
        name: $(this).text(),
        number: number
      });
      number++;
    });

    var categories = [];
    _.each(boards, function(eachBoard) {
      if (_.last(categories) &&
        _.last(categories).board &&
        _.last(categories).category === eachBoard.category) {

        _.last(categories).board.push({
          href: eachBoard.href,
          name: eachBoard.name,
          number: eachBoard.number
        });
      } else {
        categories.push({
          category: eachBoard.category,
          board: [{
            href: eachBoard.href,
            name: eachBoard.name,
          number: eachBoard.number
          }]
        });
      }
    });

    boardData.boards = boards;

    setMenuDl(categories);

    done();
  });
}


function setMenuDl(categories) {
  var transform = {
    dt: [{
      'tag': 'dt',
      'html': '${category} ',
      children: function() {
        return json2html.transform(this.board, transform.dd);
      }
    }],
    dd: [{
      'tag': 'dd',
      'html':' <a href="#" data-number="${number}"> ${name}</a>'
    }]
  };

  $('.accordion').json2html(categories, transform.dt);
}


function featchBody(url, done) {
  request({url: url, encoding: 'binary'},
    function (error, response, html) {
    if (error) {
      throw new Error('error: ', error);
    }

    conv = new iconv.Iconv('shift_jis','UTF-8//TRANSLIT//IGNORE');
    html = new Buffer(html, 'binary');
    var body = conv.convert(html).toString();

    return done(body);
  });
}


function setMenuEvent() {
  // 三 button
  setMenuButtonEvent();
  setMenuHoverEvent();
  setMenuAccodionEvent();
  setSubjectsOpenEvent();
}


function setMenuButtonEvent() {
  var menu = $('#slide_menu');
  var menuBtn = $('#category-button');
  var categoryList = $('#categoryList');
  var bodyContents = $('#body-contents');

  menuBtn.on('click', function() {
    $('#body-contents').toggleClass('open');

    var options = {
      duration: 100,
      queue: false
    };
    var menuWidth = 220;

    if (bodyContents.hasClass('open')) {
      bodyContents.animate({'left' : menuWidth }, options);
      menu.animate({'left' : 0 },  options);
      categoryList.animate({'margin-right': menuWidth }, options);
      menuBtn.text('x');
    } else {
      menu.animate({'left' : -menuWidth },  options);
      bodyContents.animate({'left' : 0 },  options);            
      categoryList.animate({'margin-right': 0}, options);
      menuBtn.text('三');
    }
  });
}


function setMenuHoverEvent() {
  $('#slide_menu dd,dt').hover(
    function() {
      $(this).toggleClass('hover');
    },
    function() {
      $(this).toggleClass('hover');
    }
  );
};


function setMenuAccodionEvent() {
  $('#slide_menu dt').on('click', function() {
    $(this).nextUntil('dt').slideToggle();
    $(this).toggleClass('open');
    $(this).siblings('dt').removeClass('open');
  });
}


function setSubjectsOpenEvent() {
  $('#slide_menu dl').on('click', 'a', function() {
    fetchSubjects($(this).data('number'), function() {
      $('#threads li:odd').addClass('odd');
      setThreadsHover();
      setThreadsEvent();
    });
  });
}


function fetchSubjects(subjectNumber, done) {
  var url = boardData.boards[subjectNumber].href + 'subject.txt';

  featchBody(url, function(body) {
    var subjectList = body.split('\n');
    var subjects = [];
    var threadLi = '<ul id="threads">';

    _.each(subjectList, function(subject) {
      // ex) subject
      // 1421874144.dat<>◆地震速報板の自治・議論スレッド★5&copy;2ch.net   (8)\n
      // {datId}<>{title}   ({count})
      var dats = subject.split('<>');
      if (!dats[1]) {
        return;
      }
      var titleAndCountSeparater = dats[1].lastIndexOf('(');
      var title = dats[1].slice(0, titleAndCountSeparater);
      var count = dats[1].slice(titleAndCountSeparater + 1, -1);

      var threadNumber = dats[0].split('.dat')[0];

      var countHtml = '<div class="comment-count"> ' + count + ' </div>'
      var titleHtml = '<div class="thread-title">' + title + '</div>';

      threadLi += '<li data-thread-id="' + subjectNumber + '-' +
        threadNumber + '">' + countHtml + titleHtml + '</li>';
      subjects.push({ title: title, count: count });
    });

    threadLi += '</ul>';
    $('#threads').html('');
    $('#threads').append(threadLi);
    boardData.boards[subjectNumber].subjects = subjects;

    $('.board-name').text(boardData.boards[subjectNumber].name);

    done();
  });
}

function setThreadsHover() {
  $('#threads li').hover(
    function() {
      $(this).toggleClass('hover');
    },
    function() {
      $(this).toggleClass('hover');
    }
  );
}

function setThreadsEvent() {
  $('#threads', 'li').on('click', function() {
    openThread($(this).data('thread-id'));
  });
}


function openThread(threadId) {
  var numbers = threadId.split('-');
  var subjectNumber = numbers[0];
  var threadNumber = numbers[1];
  
  var url = boardData.boards[subjectNumber].href + 'dat/' +
    threadNumber + '.dat';

  featchBody(url, function(body) {
    $('#thread').html(body);
    // TODO スレ表示
    // TODO bodyに含まれるリンクを
    // gui.Shell.openExternal('http://www.2ch.net/bbsmenu.html');
    //　を使ってブラウザで開くようにする
  });
}