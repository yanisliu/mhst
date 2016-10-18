var LIST_addr = { player:{}, monster:{}, item:{} }
LIST_addr.player.BASE = 0x9DA0;
LIST_addr.player.name = 0;
LIST_addr.player.name_bytes = 12;
LIST_addr.player.lv = 0xC4;
LIST_addr.player.exp = 0xC8;
LIST_addr.player.ZENNY = 0x5B404;
LIST_addr.monster.BASE = 0xA150;
LIST_addr.monster.next = 0x478;
LIST_addr.monster.max = 200;
LIST_addr.monster.name_bytes = 20;
LIST_addr.monster.lv = 0x5C;
LIST_addr.monster.exp = 0xE0;
LIST_addr.monster.iv = { hp: 0xD8, atk: 0xD9, def: 0xDA };
LIST_addr.item.BASE = 0x10;
LIST_addr.item.next = 8;
LIST_addr.item.max = 1499;

var isLE = true;
var data = void(0);
var data_edited = void(0);
var file = void(0);
var fileBuf = void(0);
var reader = new FileReader();
$(document.body).append('<input type="file" id="file_input" style="display:none;">');

$( function() {
  // 多言語化できたよ！やったね！
  var lang = navigator.languages ? navigator.languages[0] : (navigator.language || navigator.userLanguage);
  i18n.init({lng: lang, fallbackLng: "en"}).done(function() {
      $("body").i18n();
      //
      if(!isCompatible()) alert(i18n.t("dialog.yourBrowserDoesNotSupport"));
  });

  $('input').val(''); // 更新とかで再表示の際に誤動作しないように、全部消してやる…

  $('#file_input').change(function(){ // ファイルが選択された時
    $(this).prop('disabled', true);
    $('#file_input_li').addClass('disabled').children('a').html( i18n.t('navbar.file.open_disabled') );
    data = {};
    data_edited = {};
    file = this.files[0];
    $('#file_name').html(file.name);
    reader.readAsArrayBuffer(file);
  });

  $('input[data-edit]').change(function(){ // 値が変更された時
    if(data === void(0)) return;
    var target = $(this).attr('data-edit');
    data_edited[target] = $(this).val();
  });

  $('#button_exp_max').click(function(){ // 主人公の「経験値」のMAXボタンが叩かれた時、Lvと経験値を最大値に
    if(data === void(0)) return;
    $('#value_lv').val(99);
    $('#value_exp').val(25165822);
    $('#value_lv, #value_exp').change();
  });
});

reader.onload = function(evt){
  fileBuf = evt.target.result; //ファイル内容を全て取得

	var dataView = new DataView( fileBuf );
  var addr = LIST_addr.player.BASE;

  // 名前を抽出
  data.name = readUtf16(fileBuf, addr + LIST_addr.player.name, 12);
  $('#value_name').val(data.name);

  // 所持金を抽出
	data.zenny = dataView.getUint32(LIST_addr.player.ZENNY, isLE);
  $('#value_zenny').val(data.zenny);

  data.lv = dataView.getUint8(addr + LIST_addr.player.lv, isLE);
  $('#value_lv').val(data.lv)
  data.exp = dataView.getUint32(addr + LIST_addr.player.exp, isLE);
  $('#value_exp').val(data.exp);

  // オトモン抽出 Step1:変数セット
  var count = 1;
  data.monster = {};
  data_edited.monster = {};

  //オトモン抽出 Step2:ループ
  for(var pos=0; pos<=LIST_addr.monster.max; pos++) {
    var addr = LIST_addr.monster.BASE + LIST_addr.monster.next*pos;
    var name = readUtf16(fileBuf, addr, LIST_addr.monster.name_bytes);
    if(name === '') continue;
    data.monster[pos] = {};
    data_edited.monster[pos] = {};
    var lv = data.monster[pos].lv = dataView.getUint8( addr + LIST_addr.monster.lv , isLE );
    var exp = data.monster[pos].exp = dataView.getUint32( addr + LIST_addr.monster.exp , isLE );
    var iv_hp = data.monster[pos].iv_hp = dataView.getUint8( addr + LIST_addr.monster.iv.hp , isLE );
    var iv_atk = data.monster[pos].iv_atk = dataView.getUint8( addr + LIST_addr.monster.iv.atk , isLE );
    var iv_def = data.monster[pos].iv_def = dataView.getUint8( addr + LIST_addr.monster.iv.def , isLE );
    var dropdown = '\
    <div class="dropdown">\
      <button class="btn btn-default dropdown-toggle" type="button" id="dropdownMenu1" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">\
        \
        <span class="caret"></span>\
      </button>\
      <ul class="dropdown-menu" aria-labelledby="dropdownMenu1">\
        <li><a href="javascript:void(0)" id="lv_max" data-pos="' + pos + '">レベル／経験値 MAX</a></li>\
        <li role="separator" class="divider"></li>\
        <li><a href="javascript:void(0)" id="iv_set" data-pos="' + pos + '" data-iv="26,27,27">IV: 26,27,27</a></li>\
      </ul>\
    </div>\
    ';

    var tr = $('<tr></tr>').attr('data-pos', pos).appendTo('table#list_monster > tbody');
    $('<th scope="row"></th>').html( count ).appendTo(tr);
    var td_addr = $('<td></td>').html( '0x' + ( '000' + addr.toString(16).toUpperCase() ).slice(-4) ).appendTo(tr);
    var td_name = $('<td></td>').html( name ).attr('data-edit', 'name').appendTo(tr);
    var td_lv = $('<td></td>').html( lv ).attr('data-edit', 'lv').appendTo(tr);
    var td_exp = $('<td></td>').html( exp ).attr('data-edit', 'exp').appendTo(tr);
    var td_hp = $('<td></td>').html( iv_hp ).attr('data-edit', 'iv_hp').appendTo(tr);
    var td_atk = $('<td></td>').html( iv_atk ).attr('data-edit', 'iv_atk').appendTo(tr);
    var td_def = $('<td></td>').html( iv_def ).attr('data-edit', 'iv_def').appendTo(tr);
    var td_dropdown = $('<td></td>').html( dropdown ).appendTo(tr);

    td_name.click(function(){
      var id = $(this).attr('data-edit');
      var pos = $(this).parent().attr('data-pos');
      var oldValue = data_edited.monster[pos]['name'] || data.monster[pos]['name'];

      var value = prompt( i18n.t('dialog.enterANewValue') + i18n.t('LIST_condition.monster.name'), oldValue);
      if(!value) return;

      if( !(value.length <= LIST_addr.monster.name_bytes/2) ) {
        alert( i18n.t('dialog.enterACollectValue') + i18n.t('LIST_condition.monster.name') );
        return;
      }
      data_edited.monster[pos][id] = value;
      $(this).html(value);
    });

    td_lv.add(td_exp).click(function(){
      var conditions = {
        lv: function(v) {return (0 <= v && v <= 99)},
        exp: function(v) {return (0 <= v && v <= 25165822)},
      };
      var id = $(this).attr('data-edit');
      var pos = $(this).parent().attr('data-pos');
      var value = prompt( i18n.t('dialog.enterANewValue') + i18n.t('LIST_condition.monster.' + id), data.item[id]);
      if(value === null) return;
      value = parseInt(value);

      if( !conditions[id](value) ) {alert( i18n.t('dialog.enterACollectValue') + i18n.t('LIST_condition.monster.' + id) ); return}

      data_edited.monster[id] = value;
      $(this).html(value);
    });

    td_hp.add(td_atk).add(td_def).click(function(){
      var id = $(this).attr('data-edit');
      var pos = $(this).parent().attr('data-pos');
      var oldValue = data_edited.monster[pos][id] || data.monster[pos][id];

      var value = prompt( i18n.t('dialog.enterANewValue') + i18n.t('LIST_condition.monster.iv'), oldValue);
      if(value === null) return;
      value = parseInt(value);

      data_edited.monster[pos][id] = value;
      var iv_hp = data_edited.monster[pos].iv_hp || data.monster[pos].iv_hp;
      var iv_atk = data_edited.monster[pos].iv_atk || data.monster[pos].iv_atk;
      var iv_def = data_edited.monster[pos].iv_def || data.monster[pos].iv_def;

      if( !(0 <= value && value <= 80 && iv_hp + iv_atk + iv_def <= 80) ) {
        alert( i18n.t('dialog.enterACollectValue') + i18n.t('LIST_condition.monster.iv') );
        data_edited.monster[pos][id] = oldValue;
        return;
      }
      $(this).html(value);
    });

    td_dropdown.find('#lv_max').click(function(){
      var pos = $(this).attr('data-pos');
      var parent = $('table#list_monster > tbody > tr[data-pos=' + pos + ']');
      var lv = data_edited.monster[pos].lv = 99;
      parent.children('td[data-edit=lv]').html(lv);
      var exp = data_edited.monster[pos].exp = 25165822;
      parent.children('td[data-edit=exp]').html(exp);
    });

    td_dropdown.find('#iv_set').click(function(){
      var pos = $(this).attr('data-pos');
      var iv_list = $(this).attr('data-iv').split(',');
      var parent = $('table#list_monster > tbody > tr[data-pos=' + pos + ']');
      var iv_hp = data_edited.monster[pos].iv_hp = iv_list[0];
      parent.children('td[data-edit=iv_hp]').html(iv_hp);
      var iv_atk = data_edited.monster[pos].iv_atk = iv_list[1];
      parent.children('td[data-edit=iv_atk]').html(iv_atk);
      var iv_def = data_edited.monster[pos].iv_def = iv_list[2];
      parent.children('td[data-edit=iv_def]').html(iv_def);
    });

    count++;
  }

  // アイテム抽出 Step1:変数セット
  var count = 1;
  data.item = {};
  data_edited.item = {};
  data.item_pos = {};

  //アイテム抽出 Step2:ループ
  for(var pos=0; pos<=LIST_addr.item.max; pos++) {
    var addr = LIST_addr.item.BASE + LIST_addr.item.next*pos;
    var id = dataView.getUint16( addr , isLE );
    var idKey = ( '000' + id.toString(16) ).slice(-4);
    var idStr = idKey.toUpperCase();
    var name = i18n.t('LIST_item.' + idKey);
    name = (name === ('LIST_item.' + idKey) ) ? '？？？？？？' : name; // i18nはキーが見つからないとき「キーそのものを文字列として」返すことを利用
    data.item[id] = dataView.getUint16( addr + 2 , isLE );
    if(data.item[id] === 0) continue;
    data.item_pos[id] = pos;
    var tr = $('<tr></tr>').appendTo('table#list_item > tbody');
    $('<th scope="row"></th>').html( count ).appendTo(tr);
    var td_addr = $('<td></td>').html( '0x' + ( '000' + addr.toString(16).toUpperCase() ).slice(-4) ).appendTo(tr);
    var td_pos = $('<td></td>').html( (pos+1) ).appendTo(tr);
    var td_id = $('<td></td>').html( idStr ).appendTo(tr);
    var td_name = $('<td></td>').html( name ).appendTo(tr);
    var td_num = $('<td></td>').html( data.item[id] ).attr('data-item_id', id).appendTo(tr);

    td_num.click(function(){
      var id = $(this).attr('data-item_id');
      var oldValue = data.item[id] || data_edited.item[id]; // 既に編集されていた場合はその値を、そうでないならば元データを引っ張ってくる
      var value = prompt( i18n.t('dialog.enterANewValue'), oldValue );
      if(value === null) return;
      value = parseInt(value);
      if( !(1 <= value && value <= 999) ) {alert( i18n.t('dialog.enterACollectValue') + i18n.t('LIST_condition.item') ); return}

      data_edited.item[id] = value;
      $(this).html(value);
    });
    count++;
  }
}

function saveFile() {
  var fileBuf_new = fileBuf.slice(0);
  var dataView_new = new DataView(fileBuf_new);

  // 編集前と値を比較
  var addr = LIST_addr.player.BASE;
  if('name' in data_edited) writeUtf16(fileBuf_new, addr + LIST_addr.player.name, LIST_addr.player.name_bytes, data_edited.name); // 名前の場合
  if('zenny' in data_edited) dataView_new.setUint32(LIST_addr.player.ZENNY, parseInt(data_edited.zenny), isLE); // 所持金の場合
  if('lv' in data_edited) dataView_new.setUint8(addr + LIST_addr.player.lv, parseInt(data_edited.lv), isLE); // レベルの場合
  if('exp' in data_edited) dataView_new.setUint32(addr + LIST_addr.player.exp, parseInt(data_edited.exp), isLE); // 経験値の場合

  $.each(data_edited.monster, function(pos, val){ // オトモンの場合
    var addr = LIST_addr.monster.BASE + LIST_addr.monster.next*(pos);
    if('name' in val) writeUtf16(fileBuf_new, addr + LIST_addr.monster.name, LIST_addr.monster.name_bytes, data_edited.name); // 名前の場合
    if('lv' in val) dataView_new.setUint8(addr + LIST_addr.monster.lv, val.lv, isLE);
    if('exp' in val) dataView_new.setUint32(addr + LIST_addr.monster.exp, val.exp, isLE);
    if('iv_hp' in val) dataView_new.setUint8(addr + LIST_addr.monster.iv.hp, val.iv_hp, isLE);
    if('iv_atk' in val) dataView_new.setUint8(addr + LIST_addr.monster.iv.atk, val.iv_atk, isLE);
    if('iv_def' in val) dataView_new.setUint8(addr + LIST_addr.monster.iv.def, val.iv_def, isLE);
  });

  $.each(data_edited.item, function(id, val){ // アイテムの場合
    var pos = data.item_pos[id];
    var addr = LIST_addr.item.BASE + LIST_addr.item.next*(pos) + 2;
    if(data.item[id] !== val) dataView_new.setUint16(addr, val, isLE);
  });

  makeBlob('mhr_game0.sav', fileBuf_new);
}

function makeBlob(fileName, data) {
  var now = new Date();
  var blob = new Blob([data], {type: "application/octet-binary"});
  if(fileName){
      if (navigator.msSaveBlob) {
          // IE用
          navigator.msSaveBlob(blob, fileName);
      } else {
          var aelm = $("<a>").attr({
              href: URL.createObjectURL(blob),
              download: fileName
          }).text(fileName)[0];
          var evt = document.createEvent("MouseEvents");
          evt.initEvent("click", false, true);
          aelm.dispatchEvent(evt);
      }
  }
}

function readUtf16(buffer, start, bytes) {
  var bufferDV = new DataView(buffer)
  ,   str = ''
  ,   end = start+bytes;
  for(var i=start; i<end; i+=2) {
    var code = bufferDV.getUint16(i, isLE);
    if(code === 0) break;
    str += String.fromCharCode(code);
  }
  return str;
}

function writeUtf16(buffer, start, bytes, str) {
  var length = bytes/2 // lengthは２バイト×何個かという変数。つまりいつでもバイト数の1/2になる
  ,   end = start+bytes
  ,   bufferDV = new DataView(buffer);
  writeNull(buffer, start, bytes);
  for(var i=0; i<length; i++) {
    var code = str.charCodeAt(i);
    if(isNaN(code)) break;
    bufferDV.setUint16(start+i*2, code, isLE); // i*2=オフセット
  }
}

function writeNull(buffer, start, bytes) {
  var nullBuf = new ArrayBuffer(bytes);
  buffer.merge(nullBuf, start);
}

function isCompatible() {
  return window.ArrayBuffer
      ;
}

ArrayBuffer.prototype.merge = function(that, pos){
  if(pos == void(0)) pos = 0;
  var whole = new Uint8Array(this);
  whole.set(new Uint8Array(that), pos);
  return whole.buffer;
}
