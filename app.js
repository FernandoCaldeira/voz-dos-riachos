// Import Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, increment, arrayUnion, arrayRemove, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Import Firebase config
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authModal = document.getElementById('authModal');
const closeModal = document.querySelector('.close');
const authForm = document.getElementById('authForm');
const authToggle = document.getElementById('authToggle');
const modalTitle = document.getElementById('modalTitle');
const createPostSection = document.getElementById('createPostSection');
const createPostForm = document.getElementById('createPostForm');
const postsContainer = document.getElementById('postsContainer');

// State
let isSignupMode = false;
let currentUser = null;

// Auth State Observer
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        // User is logged in
        loginBtn.style.display = 'none';
        signupBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        createPostSection.style.display = 'block';
    } else {
        // User is logged out
        loginBtn.style.display = 'block';
        signupBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        createPostSection.style.display = 'none';
    }
});

// Modal Functions
function openModal(signupMode = false) {
    isSignupMode = signupMode;
    modalTitle.textContent = signupMode ? 'Criar Conta' : 'Entrar';
    authToggle.textContent = signupMode 
        ? 'Já tem conta? Entrar' 
        : 'Não tem conta? Criar conta';
    authModal.style.display = 'block';
}

function closeAuthModal() {
    authModal.style.display = 'none';
    authForm.reset();
}

// Event Listeners
loginBtn.addEventListener('click', () => openModal(false));
signupBtn.addEventListener('click', () => openModal(true));
closeModal.addEventListener('click', closeAuthModal);
authToggle.addEventListener('click', () => openModal(!isSignupMode));

window.addEventListener('click', (e) => {
    if (e.target === authModal) {
        closeAuthModal();
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        alert('Sessão terminada com sucesso!');
    } catch (error) {
        alert('Erro ao terminar sessão: ' + error.message);
    }
});

// Auth Form Submit
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        if (isSignupMode) {
            await createUserWithEmailAndPassword(auth, email, password);
            alert('Conta criada com sucesso!');
        } else {
            await signInWithEmailAndPassword(auth, email, password);
            alert('Login efetuado com sucesso!');
        }
        closeAuthModal();
    } catch (error) {
        let errorMessage = 'Ocorreu um erro: ' + error.message;
        
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Este email já está em uso.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'A palavra-passe deve ter pelo menos 6 caracteres.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Email inválido.';
        } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = 'Email ou palavra-passe incorretos.';
        }
        
        alert(errorMessage);
    }
});

// Create Post
createPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
        alert('Precisa de fazer login para criar uma publicação.');
        return;
    }
    
    const title = document.getElementById('postTitle').value.trim();
    const body = document.getElementById('postBody').value.trim();
    
    if (title.length === 0 || body.length === 0) {
        alert('Por favor preencha todos os campos.');
        return;
    }
    
    try {
        await addDoc(collection(db, 'posts'), {
            title: title,
            body: body,
            votes: 0,
            votedBy: [],
            authorId: currentUser.uid,
            city: 'riachos', // Default city for now
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        createPostForm.reset();
        alert('Publicação criada com sucesso!');
    } catch (error) {
        alert('Erro ao criar publicação: ' + error.message);
    }
});

// Load and Display Posts
function loadPosts() {
    const q = query(collection(db, 'posts'), orderBy('votes', 'desc'), orderBy('createdAt', 'desc'));
    
    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            postsContainer.innerHTML = '<p class="empty-state">Ainda não há publicações. Seja o primeiro a reportar um problema!</p>';
            return;
        }
        
        postsContainer.innerHTML = '';
        
        snapshot.forEach((docSnapshot) => {
            const post = docSnapshot.data();
            const postId = docSnapshot.id;
            
            const postCard = createPostCard(post, postId);
            postsContainer.appendChild(postCard);
        });
    }, (error) => {
        console.error('Erro ao carregar publicações:', error);
        postsContainer.innerHTML = '<p class="empty-state">Erro ao carregar publicações.</p>';
    });
}

// Create Post Card Element
function createPostCard(post, postId) {
    const card = document.createElement('div');
    card.className = 'post-card';
    
    const hasVoted = currentUser && post.votedBy && post.votedBy.includes(currentUser.uid);
    const isAuthor = currentUser && currentUser.uid === post.authorId;
    
    const createdDate = post.createdAt?.toDate ? post.createdAt.toDate() : new Date();
    const timeAgo = getTimeAgo(createdDate);
    
    card.innerHTML = `
        <div class="vote-section">
            <button class="vote-btn ${hasVoted ? 'voted' : ''}" 
                    data-post-id="${postId}"
                    ${!currentUser ? 'disabled' : ''}
                    title="${!currentUser ? 'Faça login para votar' : hasVoted ? 'Remover voto' : 'Votar'}">
                ▲
            </button>
            <span class="vote-count">${post.votes || 0}</span>
        </div>
        <div class="post-content">
            <div class="post-header">
                <h3 class="post-title">${escapeHtml(post.title)}</h3>
                ${isAuthor ? `<button class="delete-btn" data-post-id="${postId}">Eliminar</button>` : ''}
            </div>
            <div class="post-meta">
                <span>${timeAgo}</span>
                <span>${post.city || 'riachos'}</span>
            </div>
            <p class="post-body">${escapeHtml(post.body)}</p>
        </div>
    `;
    
    // Add vote button listener
    const voteBtn = card.querySelector('.vote-btn');
    if (voteBtn && currentUser) {
        voteBtn.addEventListener('click', () => handleVote(postId, hasVoted));
    }
    
    // Add delete button listener
    const deleteBtn = card.querySelector('.delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => handleDelete(postId));
    }
    
    return card;
}

// Handle Vote
async function handleVote(postId, hasVoted) {
    if (!currentUser) {
        alert('Precisa de fazer login para votar.');
        return;
    }
    
    try {
        const postRef = doc(db, 'posts', postId);
        
        if (hasVoted) {
            // Remove vote
            await updateDoc(postRef, {
                votes: increment(-1),
                votedBy: arrayRemove(currentUser.uid),
                updatedAt: new Date()
            });
        } else {
            // Add vote
            await updateDoc(postRef, {
                votes: increment(1),
                votedBy: arrayUnion(currentUser.uid),
                updatedAt: new Date()
            });
        }
    } catch (error) {
        alert('Erro ao votar: ' + error.message);
    }
}

// Handle Delete
async function handleDelete(postId) {
    if (!confirm('Tem a certeza que deseja eliminar esta publicação?')) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'posts', postId));
        alert('Publicação eliminada com sucesso!');
    } catch (error) {
        alert('Erro ao eliminar publicação: ' + error.message);
    }
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'agora mesmo';
    if (seconds < 3600) return `há ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `há ${Math.floor(seconds / 3600)} horas`;
    if (seconds < 604800) return `há ${Math.floor(seconds / 86400)} dias`;
    
    return date.toLocaleDateString('pt-PT');
}

// Initialize
loadPosts();
