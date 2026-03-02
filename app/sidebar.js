// ─── sidebar.js ────────────────────────────────────────────────────────────────
// Depends on: supabase.js (exposes window.db), global db client
// ───────────────────────────────────────────────────────────────────────────────

// ── session user ID ─────────────────────────────────────────────────────────
const USER_ID = (() => {
    let id = sessionStorage.getItem('bruinpov_uid');
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem('bruinpov_uid', id); }
    return id;
})();

// ── state ───────────────────────────────────────────────────────────────────
let sidebarLandmark  = null;
let selectedTags     = [];
let pendingBlob      = null;
let recTimerInterval = null;
let recSeconds       = 0;
let hasRecording     = false;
let isRec            = false;

const TAGS = ['vibes','chill','fire','rant','story','tea','review','nostalgia'];

// ── open/close ──────────────────────────────────────────────────────────────
window.openSidebar = function(name, coords) {
    sidebarLandmark = { name, coords };
    document.getElementById('sb-landmark-name').textContent = name;
    resetCompose();
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('map').classList.add('sidebar-open');
    loadPosts(name);
};

// ── load posts ──────────────────────────────────────────────────────────────
async function loadPosts(landmarkName) {
    const f = document.getElementById('sb-feed');
    f.innerHTML = '<div class="sb-loading">Loading memories\u2026</div>';

    const { data, error } = await db
        .from('memories')
        .select('*')
        .eq('landmark_name', landmarkName)
        .order('created_at', { ascending: false });

    if (error) {
        f.innerHTML = '<div class="sb-empty"><div class="icon">\u26a0\ufe0f</div>Could not load posts.<br><small>' + error.message + '</small></div>';
        return;
    }

    document.getElementById('sb-post-count').textContent =
        data.length ? data.length + ' memor' + (data.length === 1 ? 'y' : 'ies') : '';

    if (!data.length) {
        f.innerHTML = '<div class="sb-empty"><div class="icon">\uD83C\uDF99\uFE0F</div>No memories here yet.<br>Be the first to drop one.</div>';
        return;
    }

    f.innerHTML = '';
    for (const mem of data) {
        f.appendChild(await buildCard(mem));
    }
}

// ── build card ──────────────────────────────────────────────────────────────
async function buildCard(memory) {
    const { data: voteRows } = await db.from('likes').select('vote_type').eq('memory_id', memory.id);
    const upvotes   = (voteRows||[]).filter(r=>r.vote_type==='upvote').length;
    const downvotes = (voteRows||[]).filter(r=>r.vote_type==='downvote').length;

    const { data: myRow } = await db.from('likes').select('vote_type')
        .eq('memory_id', memory.id).eq('user_id', USER_ID).maybeSingle();
    const myVote = myRow ? myRow.vote_type : null;

    const tagsArr = Array.isArray(memory.tags)
        ? memory.tags
        : (memory.tags ? String(memory.tags).split(',').map(t=>t.trim()).filter(Boolean) : []);

    const tagsHTML = tagsArr.map(t=>'<span class="tag tag-'+t+'">'+t+'</span>').join('');

    let audioHTML = '';
    if (memory.audio_url) {
        const waveHTML = Array.from({length:28},()=>{
            const h = Math.max(3,Math.floor(Math.random()*16+3));
            return '<div class="audio-bar" style="height:'+h+'px"></div>';
        }).join('');
        audioHTML =
            '<div class="card-audio" id="audio-'+memory.id+'">' +
                '<button class="audio-play-btn" data-url="'+memory.audio_url+'" data-id="'+memory.id+'" onclick="toggleCardAudio(this)">\u25B6</button>' +
                '<div class="audio-bar-wrap">'+waveHTML+'</div>' +
                '<div class="audio-time" id="audio-time-'+memory.id+'">\u2014</div>' +
            '</div>';
    }

    const net = upvotes - downvotes;
    const card = document.createElement('div');
    card.className = 'memory-card';
    card.id = 'card-'+memory.id;
    card.innerHTML =
        '<div class="card-meta">' +
            (tagsArr.length ? '<div class="card-tags">'+tagsHTML+'</div>' : '<div></div>') +
            '<div class="card-time">'+timeAgo(memory.created_at)+'</div>' +
        '</div>' +
        (memory.text ? '<div class="card-text">'+esc(memory.text)+'</div>' : '') +
        audioHTML +
        '<div class="card-votes" id="votes-'+memory.id+'">' +
            '<button class="vote-btn up '+(myVote==='upvote'?'active':'')+'" onclick="castVoteUI(\''+memory.id+'\',\'upvote\',this)">' +
                '\uD83D\uDC4D <span class="up-count">'+upvotes+'</span></button>' +
            '<button class="vote-btn down '+(myVote==='downvote'?'active':'')+'" onclick="castVoteUI(\''+memory.id+'\',\'downvote\',this)">' +
                '\uD83D\uDC4E <span class="down-count">'+downvotes+'</span></button>' +
            '<span class="vote-score">'+(net>0?'+':'')+net+'</span>' +
        '</div>';

    return card;
}

// ── audio playback ──────────────────────────────────────────────────────────
let _audio=null, _audioBtn=null, _audioMemId=null, _barInt=null;

window.toggleCardAudio = function(btn) {
    const url   = btn.dataset.url;
    const memId = btn.dataset.id;

    if (_audio) {
        _audio.pause(); _audio=null;
        if (_audioBtn) { _audioBtn.textContent='\u25B6'; _audioBtn.classList.remove('playing'); }
        clearInterval(_barInt);
        if (_audioMemId) resetBars(_audioMemId);
        if (_audioMemId === memId) { _audioMemId=null; return; }
    }

    _audio = new Audio(url); _audioBtn = btn; _audioMemId = memId;
    btn.textContent='\u23F9'; btn.classList.add('playing');
    _audio.play().catch(e=>console.error(e));

    _audio.onloadedmetadata = function() {
        const el = document.getElementById('audio-time-'+memId);
        if (el) el.textContent = fmtDur(_audio.duration);

        const bars = document.querySelectorAll('#audio-'+memId+' .audio-bar');
        let i=0;
        _barInt = setInterval(()=>{
            if (i<bars.length) bars[i++].classList.add('played');
        }, (_audio.duration*1000)/bars.length);
    };

    _audio.onended = function() {
        btn.textContent='\u25B6'; btn.classList.remove('playing');
        clearInterval(_barInt); resetBars(memId);
        _audio=null; _audioBtn=null; _audioMemId=null;
    };
};

function resetBars(memId) {
    document.querySelectorAll('#audio-'+memId+' .audio-bar').forEach(b=>b.classList.remove('played'));
}

// ── voting ──────────────────────────────────────────────────────────────────
window.castVoteUI = async function(memoryId, voteType, clickedBtn) {
    const voteRow = document.getElementById('votes-'+memoryId);
    const upBtn   = voteRow.querySelector('.vote-btn.up');
    const downBtn = voteRow.querySelector('.vote-btn.down');
    const scoreEl = voteRow.querySelector('.vote-score');
    const isUp    = voteType === 'upvote';
    const other   = isUp ? downBtn : upBtn;
    const myCount = clickedBtn.querySelector(isUp ? '.up-count' : '.down-count');
    const othCount = other.querySelector(isUp ? '.down-count' : '.up-count');
    const wasActive = clickedBtn.classList.contains('active');

    // optimistic UI
    if (wasActive) {
        clickedBtn.classList.remove('active');
        myCount.textContent = Math.max(0, parseInt(myCount.textContent)-1);
    } else {
        clickedBtn.classList.add('active');
        myCount.textContent = parseInt(myCount.textContent)+1;
        if (other.classList.contains('active')) {
            other.classList.remove('active');
            othCount.textContent = Math.max(0, parseInt(othCount.textContent)-1);
        }
    }
    const net = parseInt(upBtn.querySelector('.up-count').textContent) - parseInt(downBtn.querySelector('.down-count').textContent);
    scoreEl.textContent = (net>0?'+':'')+net;

    // persist
    const { data: ex } = await db.from('likes').select('vote_type')
        .eq('memory_id',memoryId).eq('user_id',USER_ID).maybeSingle();
    const prev = ex ? ex.vote_type : null;

    if (prev === voteType) {
        await db.from('likes').delete().eq('memory_id',memoryId).eq('user_id',USER_ID);
    } else if (prev) {
        await db.from('likes').update({vote_type:voteType}).eq('memory_id',memoryId).eq('user_id',USER_ID);
    } else {
        await db.from('likes').insert({memory_id:memoryId, user_id:USER_ID, vote_type:voteType});
    }
};

// ── compose ─────────────────────────────────────────────────────────────────
function resetCompose() {
    selectedTags=[]; pendingBlob=null; hasRecording=false; recSeconds=0;
    if (isRec) stopRec();
    const ta = document.getElementById('compose-text');
    if (ta) ta.value = '';
    document.querySelectorAll('.compose-tag').forEach(t=>t.classList.remove('selected'));
    setRecLabel('Tap \uD83D\uDD34 to record a voice memo', false);
    const timer = document.getElementById('rec-timer');
    if (timer) timer.style.display='none';
    const rb = document.getElementById('rec-btn');
    if (rb) rb.classList.remove('recording');
}

window.toggleTag = function(el) {
    const tag = el.dataset.tag;
    if (el.classList.contains('selected')) {
        el.classList.remove('selected');
        selectedTags = selectedTags.filter(t=>t!==tag);
    } else {
        el.classList.add('selected');
        selectedTags.push(tag);
    }
};

window.toggleRecord = async function() {
    if (!isRec) await startRec(); else await stopRec();
};

async function startRec() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({audio:true});
        window._recStream=stream; window._recChunks=[];
        window._mediaRecorder = new MediaRecorder(stream);
        window._mediaRecorder.ondataavailable = e => { if(e.data.size>0) window._recChunks.push(e.data); };
        window._mediaRecorder.start();
        isRec=true; recSeconds=0;
        document.getElementById('rec-btn').classList.add('recording');
        document.getElementById('rec-timer').style.display='block';
        setRecLabel('Recording\u2026 tap to stop', false);
        recTimerInterval = setInterval(()=>{
            recSeconds++;
            const m=String(Math.floor(recSeconds/60)).padStart(2,'0');
            const s=String(recSeconds%60).padStart(2,'0');
            document.getElementById('rec-timer').textContent=m+':'+s;
            if (recSeconds>=120) stopRec();
        }, 1000);
    } catch(e) {
        alert('Microphone access denied. Please allow microphone access to record.');
    }
}

function stopRec() {
    return new Promise(resolve => {
        if (!isRec||!window._mediaRecorder) { resolve(); return; }
        clearInterval(recTimerInterval);
        isRec = false;
        window._mediaRecorder.onstop = function() {
            pendingBlob  = new Blob(window._recChunks, {type:'audio/webm'});
            hasRecording = true;
            window._recStream.getTracks().forEach(t=>t.stop());
            document.getElementById('rec-btn').classList.remove('recording');
            setRecLabel('\u2713 Voice memo ready ('+recSeconds+'s)', true);
            resolve();
        };
        window._mediaRecorder.stop();
    });
}

function setRecLabel(text, hasRec) {
    const el = document.getElementById('rec-label');
    if (!el) return;
    el.textContent = text;
    el.className = 'rec-label'+(hasRec?' has-recording':'');
}

window.submitPost = async function() {
    const text = document.getElementById('compose-text').value.trim();
    if (!text && !hasRecording) {
        document.getElementById('compose-text').style.borderColor='#ef4444';
        setTimeout(()=>document.getElementById('compose-text').style.borderColor='', 1500);
        return;
    }

    const postBtn = document.getElementById('post-btn');
    postBtn.disabled=true; postBtn.textContent='Posting\u2026';

    // stop recording if still going
    if (isRec) await stopRec();

    let audioUrl = null;
    if (hasRecording && pendingBlob) {
        const filename = USER_ID+'-'+Date.now()+'.webm';
        const { error: upErr } = await db.storage.from('audio').upload(filename, pendingBlob, {contentType:'audio/webm'});
        if (!upErr) {
            const { data: urlData } = db.storage.from('audio').getPublicUrl(filename);
            audioUrl = urlData.publicUrl;
        } else {
            console.error('Audio upload error:', upErr);
        }
    }

    const { data, error } = await db.from('memories').insert({
        landmark_name : sidebarLandmark.name,
        lat           : sidebarLandmark.coords[0],
        lng           : sidebarLandmark.coords[1],
        text          : text || null,
        audio_url     : audioUrl,
        tags          : selectedTags.length ? selectedTags : null,
        user_id       : USER_ID
    }).select().single();

    postBtn.disabled=false; postBtn.textContent='Post Memory';

    if (error) { alert('Failed to post: '+error.message); return; }

    // prepend to feed
    const f = document.getElementById('sb-feed');
    const empty = f.querySelector('.sb-empty');
    if (empty) f.innerHTML='';
    f.prepend(await buildCard(data));

    // update count
    const countEl = document.getElementById('sb-post-count');
    if (countEl) {
        const cur = parseInt(countEl.textContent)||0;
        countEl.textContent = (cur+1)+' memor'+(cur+1===1?'y':'ies');
    }

    resetCompose();
};

window.clearCompose = function() { resetCompose(); };

// ── helpers ─────────────────────────────────────────────────────────────────
function timeAgo(iso) {
    const diff=(Date.now()-new Date(iso))/1000;
    if(diff<60)    return 'just now';
    if(diff<3600)  return Math.floor(diff/60)+'m ago';
    if(diff<86400) return Math.floor(diff/3600)+'h ago';
    return Math.floor(diff/86400)+'d ago';
}
function fmtDur(s) {
    if(!s||isNaN(s)) return '\u2014';
    return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
}
function esc(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── inject sidebar HTML ──────────────────────────────────────────────────────
(function injectSidebar() {
    const tagsHTML = TAGS.map(t=>
        '<button class="compose-tag tag-'+t+'" data-tag="'+t+'" onclick="toggleTag(this)">'+t+'</button>'
    ).join('');

    const html =
        '<div id="sidebar">' +
            '<div class="sb-header">' +
                '<div class="sb-title">' +
                    '<div class="sb-landmark" id="sb-landmark-name">\u2014</div>' +
                    '<div class="sb-subtitle">\uD83D\uDCCD Bruin Memories</div>' +
                '</div>' +
                '<button class="sb-close" onclick="document.getElementById(\'sidebar\').classList.remove(\'open\');document.getElementById(\'map\').classList.remove(\'sidebar-open\');">\u2715</button>' +
            '</div>' +
            '<div class="sb-post-count" id="sb-post-count"></div>' +
            '<div class="sb-feed" id="sb-feed">' +
                '<div class="sb-empty"><div class="icon">\uD83D\uDDFA\uFE0F</div>Click a landmark on the map<br>to view its memories.</div>' +
            '</div>' +
            '<div class="sb-compose">' +
                '<div class="recorder-bar">' +
                    '<button class="rec-circle-btn" id="rec-btn" onclick="toggleRecord()">' +
                        '<div class="rec-dot-inner"></div>' +
                    '</button>' +
                    '<span class="rec-label" id="rec-label">Tap \uD83D\uDD34 to record a voice memo</span>' +
                    '<span class="rec-timer" id="rec-timer" style="display:none">00:00</span>' +
                '</div>' +
                '<textarea class="compose-textarea" id="compose-text" placeholder="Add a note\u2026 (optional if you have a voice memo)"></textarea>' +
                '<div class="compose-tags">'+tagsHTML+'</div>' +
                '<div class="compose-actions">' +
                    '<button class="btn-post" id="post-btn" onclick="submitPost()">Post Memory</button>' +
                    '<button class="btn-clear" onclick="clearCompose()">Clear</button>' +
                '</div>' +
            '</div>' +
        '</div>';

    // inject after body loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ()=>document.body.insertAdjacentHTML('beforeend', html));
    } else {
        document.body.insertAdjacentHTML('beforeend', html);
    }
})();