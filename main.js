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

  $('input').val('');

  $('#file_input').change(function(){ // ファイルが選択された時
    data = {};
    data_edited = {};
    file = this.files[0];
    $('#file_name').html(file.name);
    reader.readAsArrayBuffer(file);
  });

  $('[data-edit]').change(function(){ // 値が変更された時
    if(data === void(0)) return;
    var target = $(this).data('edit');
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

  // 名前を抽出
  data.name = readUtf16(fileBuf, 0x9DA0, 12);
  $('#value_name').val(data.name);

  // 所持金を抽出
	data.zenny = dataView.getUint32(0x5B404, isLE);
  $('#value_zenny').val(data.zenny);

  data.lv = dataView.getUint8(0x9E64, isLE);
  $('#value_lv').val(data.lv);

  data.exp = dataView.getUint32(0x9E68, isLE);
  $('#value_exp').val(data.exp);

  // アイテム抽出（変数セット→ループ）
  var count = 1;
  data.item = {};
  data_edited.item = {};
  data.item_pos = {};

  for(var pos=0; pos<=1496; pos++) {
    var addr = 0x10 + 8*pos;
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
    var td_num = $('<td></td>').html( data.item[id] ).data('item_id', id).appendTo(tr);

    td_num.click(function(){
      var id = $(this).data('item_id');
      var value = prompt( i18n.t('dialog.enterANewValue'), data.item[id]);
      if(value === null) return;
      value = parseInt(value);
      if( !(0 < value && value < 1000) ) {alert( i18n.t('dialog.enterACollectValue', {min:1, max:999}) ); return}

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
  if('name' in data_edited) writeUtf16(fileBuf_new, 0x9DA0, 12, data_edited.name); // 名前の場合
  if('zenny' in data_edited) dataView_new.setUint32(0x5B404, parseInt(data_edited.zenny), isLE); // 所持金の場合
  if('lv' in data_edited) dataView_new.setUint8(0x9E64, parseInt(data_edited.lv), isLE); // レベルの場合
  if('exp' in data_edited) dataView_new.setUint32(0x9E68, parseInt(data_edited.exp), isLE); // 経験値の場合

  $.each(data_edited.item, function(id, val){ // アイテムの場合
    var pos = data.item_pos[id];
    var addr = 0x10 + 8*(pos) + 2;
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
      && window.TextDecoder
      ;
}

ArrayBuffer.prototype.merge = function(that, pos){
  if(pos == void(0)) pos = 0;
  var whole = new Uint8Array(this);
  whole.set(new Uint8Array(that), pos);
  return whole.buffer;
}
