// add items to the "Add Items" tab (dynamic load)

$(document).ready(function() {
  var $itemsDiv = $("#items-wrapper");
  var $addItems = $("#add-items");

  var allItems = [];
  var filteredItems = [];
  var renderedCount = 0;
  var pageSize = 60;
  var allTextures = [];
  var filteredTextures = [];

  function normalize(str) {
    return (str || '').toString().toLowerCase();
  }

  function ensureControls() {
    if ($("#items-controls").length) return;

    var controlsHtml = '' +
      '<div id="items-controls" style="padding: 10px 20px;">' +
        '<div class="form-group" style="margin-bottom: 8px;">' +
          '<input id="items-search" type="text" class="form-control" placeholder="Search items..." />' +
        '</div>' +
        '<div class="form-group" style="margin-bottom: 8px;">' +
          '<select id="items-category" class="form-control">' +
            '<option value="all">All Categories</option>' +
            '<option value="glb">GLB</option>' +
            '<option value="gltf">GLTF</option>' +
            '<option value="obj">OBJ</option>' +
            '<option value="json">JSON</option>' +
          '</select>' +
        '</div>' +
        '<div id="items-count" class="text-muted" style="font-size: 12px;"></div>' +
      '</div>' +
      '<div style="padding: 0 20px 10px 20px;">' +
        '<button id="items-load-more" class="btn btn-default btn-sm" style="display:none;">Load more</button>' +
      '</div>';

    $addItems.prepend(controlsHtml);

    $("#items-search").on('input', function() {
      applyFilter();
    });
    $("#items-category").on('change', function() {
      applyFilter();
    });
    $("#items-load-more").on('click', function() {
      renderMore();
    });
  }

  function ensureTextureSection() {
    if ($("#textures-section").length) return;
    var html = '' +
      '<hr />' +
      '<div id="textures-section" style="padding: 0 20px 10px 20px;">' +
        '<h4 style="margin-top: 0;">Textures</h4>' +
        '<div class="form-group" style="margin-bottom: 8px;">' +
          '<input id="textures-search" type="text" class="form-control" placeholder="Search textures..." />' +
        '</div>' +
        '<div class="form-group" style="margin-bottom: 8px;">' +
          '<select id="textures-category" class="form-control">' +
            '<option value="all">All Textures</option>' +
            '<option value="room">Room</option>' +
            '<option value="global">Global</option>' +
          '</select>' +
        '</div>' +
        '<div id="textures-count" class="text-muted" style="font-size: 12px; margin-bottom: 8px;"></div>' +
        '<div class="row" id="textures-wrapper"></div>' +
      '</div>';
    $addItems.append(html);

    $("#textures-search").on('input', function() {
      applyTextureFilter();
    });
    $("#textures-category").on('change', function() {
      applyTextureFilter();
    });
  }

  function buildItemHtml(item) {
    var img = item.image ? '<img src="' + item.image + '" alt="' + item.name + '">' : '';
    var mtl = item.mtlUrl ? ' data-mtl-url="' + item.mtlUrl + '"' : '';
    return (
      '<div class="col-sm-4">' +
        '<a class="thumbnail add-item" model-name="' +
          item.name +
          '" model-url="' +
          item.model +
          '" model-type="' +
          item.type +
          mtl +
          '">' +
          img +
          ' ' +
          item.name +
        '</a>' +
      '</div>'
    );
  }

  function buildTextureHtml(tex) {
    var img = tex.url ? '<img src="' + tex.url + '" alt="' + tex.name + '">' : '';
    return (
      '<div class="col-sm-4">' +
        '<a class="thumbnail texture-select-thumbnail" texture-url="' + tex.url + '" texture-stretch="false" texture-scale="300">' +
          img +
          ' ' +
          tex.name +
        '</a>' +
      '</div>'
    );
  }

  function renderMore() {
    var next = filteredItems.slice(renderedCount, renderedCount + pageSize);
    if (next.length === 0) {
      $("#items-load-more").hide();
      return;
    }
    var html = '';
    for (var i = 0; i < next.length; i++) {
      html += buildItemHtml(next[i]);
    }
    $itemsDiv.append(html);
    renderedCount += next.length;

    if (renderedCount < filteredItems.length) {
      $("#items-load-more").show();
    } else {
      $("#items-load-more").hide();
    }

    updateCount();
  }

  function renderTextures() {
    ensureTextureSection();
    var $wrap = $("#textures-wrapper");
    $wrap.empty();
    var html = '';
    for (var i = 0; i < filteredTextures.length; i++) {
      html += buildTextureHtml(filteredTextures[i]);
    }
    $wrap.append(html);
    $("#textures-count").text('Showing ' + filteredTextures.length + ' textures');
  }

  function updateCount() {
    var total = filteredItems.length;
    var shown = Math.min(renderedCount, total);
    $("#items-count").text('Showing ' + shown + ' of ' + total + ' items');
  }

  function applyTextureFilter() {
    var q = normalize($("#textures-search").val());
    var cat = $("#textures-category").val();

    filteredTextures = allTextures.filter(function(tex) {
      var matchesText = !q || normalize(tex.name).indexOf(q) !== -1;
      var matchesCat = (cat === 'all') || (tex.category === cat);
      return matchesText && matchesCat;
    });

    renderTextures();
  }

  function applyFilter() {
    var q = normalize($("#items-search").val());
    var cat = $("#items-category").val();

    filteredItems = allItems.filter(function(item) {
      var matchesText = !q || normalize(item.name).indexOf(q) !== -1;
      var matchesCat = (cat === 'all') || (item.category === cat);
      return matchesText && matchesCat;
    });

    renderedCount = 0;
    $itemsDiv.empty();
    renderMore();
  }

  function initItems(items) {
    allItems = items || [];
    ensureControls();
    applyFilter();
  }

  $.getJSON('/items.json')
    .done(function(data) {
      initItems((data && data.items) ? data.items : []);
    })
    .fail(function() {
      ensureControls();
      $("#items-count").text('Failed to load /items.json');
    });

  $.getJSON('/textures.json')
    .done(function(data) {
      allTextures = (data && data.textures) ? data.textures : [];
      filteredTextures = allTextures.slice();
      renderTextures();
    })
    .fail(function() {
      ensureTextureSection();
      $("#textures-count").text('Failed to load /textures.json');
    });
});
