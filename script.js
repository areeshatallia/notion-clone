let pages = JSON.parse(localStorage.getItem('pages')) || {};
let currentPageId = localStorage.getItem('currentPageId') || null;

const pageList = document.getElementById('pageList');
const editor = document.getElementById('editor');
let selectedIndex = 0;

function renderSidebar() {
  pageList.innerHTML = '';
  Object.keys(pages).forEach(id => {
    const item = document.createElement('div');
    item.className = 'page-item' + (id === currentPageId ? ' active' : '');
    item.textContent = pages[id].title || 'Untitled';
    item.onclick = () => {
      currentPageId = id;
      localStorage.setItem('currentPageId', id);
      renderSidebar();
      loadPage();
    };
    pageList.appendChild(item);
  });
}

function createNewPage() {
  const id = Date.now().toString();
  pages[id] = { title: '', blocks: [] };
  currentPageId = id;
  localStorage.setItem('pages', JSON.stringify(pages));
  localStorage.setItem('currentPageId', id);
  renderSidebar();
  loadPage();
}

function saveCurrentPage(titleText, blocks) {
  if (currentPageId && pages[currentPageId]) {
    pages[currentPageId].title = titleText;
    pages[currentPageId].blocks = blocks;
    localStorage.setItem('pages', JSON.stringify(pages));
    renderSidebar();
  }
}

function loadPage() {
  editor.innerHTML = '';
  const page = pages[currentPageId];
  if (!page) return;

  const title = document.createElement('div');
  title.contentEditable = true;
  title.className = 'title-block';
  title.setAttribute('data-placeholder', 'New page');
  title.innerText = page.title || '';
  editor.appendChild(title);
  title.focus();

  function updateTitlePlaceholder() {
    if (title.innerText.trim() === '') {
      title.classList.add('empty');
    } else {
      title.classList.remove('empty');
    }
  }

  updateTitlePlaceholder();
  title.addEventListener('input', () => {
    updateTitlePlaceholder();
    savePage();
  });

  title.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const block = createBlock();
      editor.insertBefore(block, title.nextSibling);
      block.focus();
    }
  });

  const blocks = page.blocks || [];
  if (blocks.length === 0) {
    const info = document.createElement('div');
    info.id = 'editor-placeholder';
    info.style.color = '#888';
    info.style.fontStyle = 'italic';
    info.style.whiteSpace = 'pre-line';
    info.innerText = `📝 Use "/" to add blocks like heading, to-do, quote, code.\n⏎ Enter for new block\n⌫ Backspace to delete block\n🖱️ Drag and drop to reorder\n💾 Ctrl + S to save as .html file`;
    info.contentEditable = false;
    info.style.pointerEvents = 'none';
    info.style.userSelect = 'none';
    info.style.margin = '10px 0';
    editor.appendChild(info);

    const starter = createBlock();
    editor.appendChild(starter);
    starter.focus();
  } else {
    blocks.forEach(content => {
      const block = createBlock();
      block.innerHTML = content;
      editor.appendChild(block);
    });
  }
}

function createBlock() {
  const block = document.createElement('div');
  block.contentEditable = true;
  block.className = 'block';
  block.setAttribute('draggable', true);
  block.dataset.type = 'paragraph';
  block.setAttribute('data-placeholder', 'Type "/" for blocks...');

  block.addEventListener('keydown', function (e) {
    const menuItems = document.querySelectorAll('.slash-menu div');
    if (menuItems.length > 0 && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
      if (e.key === 'ArrowDown') {
        selectedIndex = (selectedIndex + 1) % menuItems.length;
        updateHighlight(menuItems);
        e.preventDefault();
      }
      if (e.key === 'ArrowUp') {
        selectedIndex = (selectedIndex - 1 + menuItems.length) % menuItems.length;
        updateHighlight(menuItems);
        e.preventDefault();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        menuItems[selectedIndex]?.click();
      }
      if (e.key === 'Escape') {
        document.querySelector('.slash-menu')?.remove();
        selectedIndex = 0;
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const newBlock = createBlock();
      editor.insertBefore(newBlock, block.nextSibling);
      newBlock.focus();
      savePage();
    }

    if (e.key === 'Backspace' && block.innerText.trim() === '') {
      const prev = block.previousElementSibling;
      const titleBlock = document.querySelector('.title-block');
      if (prev) {
        e.preventDefault();
        block.remove();
        prev.focus();
        placeCursorAtEnd(prev);
        savePage();
      } else if (block.previousElementSibling === titleBlock) {
        e.preventDefault();
        block.remove();
        titleBlock.focus();
        placeCursorAtEnd(titleBlock);
        savePage();
      }

      if (editor.querySelectorAll('.block').length === 0) {
        const placeholder = document.getElementById('editor-placeholder');
        if (placeholder) placeholder.style.display = 'block';
      }
    }
  });

  block.addEventListener('input', function () {
    const placeholder = document.getElementById('editor-placeholder');
    if (placeholder) placeholder.style.display = 'none';

    savePage();

    if (block.innerText.includes('/')) {
      document.querySelector('.slash-menu')?.remove();

      const menu = document.createElement('div');
      menu.className = 'slash-menu';
      menu.innerHTML = `
        <div data-type="paragraph">📝 Paragraph</div>
        <div data-type="heading">🔠 Heading</div>
        <div data-type="todo">☑️ To-do</div>
        <div data-type="quote">💬 Quote</div>
        <div data-type="code">💻 Code</div>
      `;
      const rect = block.getBoundingClientRect();
      menu.style.position = 'absolute';
      menu.style.top = rect.bottom + 'px';
      menu.style.left = rect.left + 'px';
      menu.style.background = '#444';
      menu.style.border = '1px solid #ccc';
      menu.style.padding = '5px';
      menu.style.borderRadius = '5px';
      menu.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
      menu.style.zIndex = '1000';

      document.body.appendChild(menu);
      selectedIndex = 0;
      updateHighlight(menu.querySelectorAll('div'));

      menu.querySelectorAll('div').forEach(option => {
        option.style.cursor = 'pointer';
        option.style.padding = '4px 8px';
        option.addEventListener('mouseenter', () => option.style.background = '#eee');
        option.addEventListener('mouseleave', () => updateHighlight(menu.querySelectorAll('div')));
        option.addEventListener('click', () => {
          const type = option.dataset.type;
          const cleanedText = block.innerText.replace('/', '').trim();

          const newBlock = createBlock();
          newBlock.innerText = cleanedText;
          newBlock.dataset.type = type;
          block.replaceWith(newBlock);

          if (type === 'heading') {
            newBlock.style.fontSize = '1.5rem';
            newBlock.style.fontWeight = 'bold';
          } else if (type === 'todo') {
            newBlock.innerHTML = '<input type="checkbox" style="margin-right:6px;">' + cleanedText;
            const checkbox = newBlock.querySelector('input[type="checkbox"]');
            if (checkbox) checkbox.focus();
          } else if (type === 'quote') {
            newBlock.style.borderLeft = '4px solid #ccc';
            newBlock.style.paddingLeft = '10px';
            newBlock.style.color = '#aaa';
          } else if (type === 'code') {
            newBlock.style.fontFamily = 'monospace';
            newBlock.style.background = '#333';
            newBlock.style.padding = '6px';
          }

          document.querySelector('.slash-menu')?.remove();
          newBlock.focus();
          placeCursorAtEnd(newBlock);
          savePage();
        });
      });
    }
  });

  block.addEventListener('dragstart', (e) => {
    block.classList.add('dragging');
    e.dataTransfer.setData('text/plain', '');
    window.draggingBlock = block;
  });

  block.addEventListener('dragend', () => {
    block.classList.remove('dragging');
    window.draggingBlock = null;
  });

  block.addEventListener('dragover', (e) => {
    e.preventDefault();
    const dragging = window.draggingBlock;
    if (dragging && dragging !== block) {
      const rect = block.getBoundingClientRect();
      const offset = e.clientY - rect.top;
      const middle = rect.height / 2;
      if (offset < middle) {
        editor.insertBefore(dragging, block);
      } else {
        editor.insertBefore(dragging, block.nextSibling);
      }
      savePage();
    }
  });

  return block;
}

function updateHighlight(menuItems) {
  menuItems.forEach((item, index) => {
    item.style.backgroundColor = index === selectedIndex ? '#333' : 'transparent';
  });
}

function savePage() {
  const titleText = editor.querySelector('.title-block')?.innerText.trim() || '';
  const blocks = Array.from(editor.querySelectorAll('.block')).map(b => b.innerHTML.trim());
  saveCurrentPage(titleText, blocks);
  renderSidebar();
}

document.getElementById('addPageBtn').onclick = createNewPage;

if (!currentPageId) createNewPage();
else {
  renderSidebar();
  loadPage();
}

function placeCursorAtEnd(el) {
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}
