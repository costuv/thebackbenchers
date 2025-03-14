import { auth, database } from './firebase-config.js';
import { ref, push, onValue, remove, update, get, set } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js';

export class CommentManager {
    constructor(chapterId) {
        this.chapterId = chapterId;
        this.commentTemplate = document.getElementById('commentTemplate');
        this.commentsContainer = document.getElementById('commentsContainer');
        this.commentForm = document.getElementById('commentForm');
        
        this.setupEventListeners();
        this.initializeComments();
        this.hasLoggedOut = false;  // Add flag to track logout state
    }

    setupEventListeners() {
        this.commentForm.addEventListener('submit', (e) => this.handleNewComment(e));
        
        // Use capture phase to ensure preventDefault executes before the browser processes the click
        this.commentsContainer.addEventListener('click', (e) => {
            // Immediately check if this is a like button and prevent default behavior
            if (e.target.closest('.like-btn')) {
                e.preventDefault();
            }
        }, true); // Use capture phase for early interception
        
        // Regular event handler for actual processing
        this.commentsContainer.addEventListener('click', (e) => this.handleCommentActions(e));
    }

    async handleNewComment(e) {
        e.preventDefault();
        const content = document.getElementById('commentContent').value.trim();
        const user = auth.currentUser;

        if (!content || !user) return;

        try {
            const userRef = ref(database, `users/${user.uid}`);
            const userSnapshot = await get(userRef);
            const userData = userSnapshot.val();

            // Generate a unique ID for the comment right away
            const commentsRef = ref(database, `comments/${this.chapterId}`);
            const newCommentRef = push(commentsRef);
            const commentId = newCommentRef.key;

            const newComment = {
                content,
                authorId: user.uid,
                authorName: userData?.username || 'Anonymous',
                timestamp: Date.now(),
                likes: {}
            };

            // Optimistically render the comment immediately
            const tempContainer = document.createElement('div');
            await this.renderComment(newComment, commentId, tempContainer);
            
            const newCommentElement = tempContainer.firstChild;
            if (newCommentElement) {
                newCommentElement.style.opacity = '0';
                // Always insert at the top
                if (this.commentsContainer.firstChild) {
                    this.commentsContainer.insertBefore(newCommentElement, this.commentsContainer.firstChild);
                } else {
                    this.commentsContainer.appendChild(newCommentElement);
                }
                requestAnimationFrame(() => {
                    newCommentElement.style.transition = 'opacity 0.3s ease';
                    newCommentElement.style.opacity = '1';
                });
            }

            // Clear input and remove "no comments" message
            document.getElementById('commentContent').value = '';
            const noCommentsMsg = this.commentsContainer.querySelector('p.text-gray-500.text-center');
            if (noCommentsMsg) noCommentsMsg.remove();

            // Actually save to Firebase
            await set(ref(database, `comments/${this.chapterId}/${commentId}`), newComment);
            console.log('Comment saved successfully:', commentId);

        } catch (error) {
            console.error("Error posting comment:", error);
            alert("Failed to post comment. Please try again.");
            // Remove the optimistically added comment if save failed
            const failedComment = this.commentsContainer.querySelector(`[data-comment-id="${commentId}"]`);
            if (failedComment) failedComment.remove();
        }
    }

    async handleCommentActions(e) {
        const action = e.target.closest('a, button, svg, path');
        if (!action) return;
        
        if (action.tagName === 'A') {
            e.preventDefault();
        }
        
        if (!auth.currentUser) {
            alert('Please login to interact with comments');
            return;
        }
        
        const commentItem = action.closest('.comment-item');
        const commentId = commentItem.dataset.commentId;

        switch (true) {
            case action.classList.contains('like-btn') || action.closest('.like-btn') !== null:
                const likeBtn = action.classList.contains('like-btn') ? action : action.closest('.like-btn');
                await this.toggleLike(commentId, commentItem, likeBtn);
                break;
            case action.classList.contains('delete-btn'):
                await this.deleteComment(commentId);
                break;
            case action.classList.contains('edit-btn'):
                this.enableEditing(commentItem);
                break;
        }
    }

    async toggleLike(commentId, commentItem, likeBtn) {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const userLikePath = `comments/${this.chapterId}/${commentId}/likes/${user.uid}`;
            const likesRef = ref(database, userLikePath);
            const likeSnapshot = await get(likesRef);
            const hasLiked = likeSnapshot.exists();
            
            const updates = {};
            updates[userLikePath] = hasLiked ? null : true;
            
            await update(ref(database), updates);
            
            const updatedLikesSnapshot = await get(ref(database, `comments/${this.chapterId}/${commentId}/likes`));
            const likeCount = updatedLikesSnapshot.exists() ? Object.keys(updatedLikesSnapshot.val()).length : 0;
            
            this.updateLikeUI(likeBtn, hasLiked, likeCount);
        } catch (error) {
            console.error("Error toggling like:", error);
            alert("Failed to update like.");
        }
    }

    // New helper method to update the UI for likes
    updateLikeUI(likeBtn, wasLiked, newCount) {
        if (!likeBtn) return;
        
        // Update like count display
        const likeCountEl = likeBtn.querySelector('.likes-count');
        if (likeCountEl) {
            likeCountEl.textContent = newCount;
        }
        
        // Update like button appearance
        const likeIcon = likeBtn.querySelector('svg');
        if (wasLiked) {
            // Was liked, now unliked
            likeBtn.classList.remove('text-red-500');
            if (likeIcon) likeIcon.classList.remove('fill-red-500');
        } else {
            // Was not liked, now liked
            likeBtn.classList.add('text-red-500');
            if (likeIcon) likeIcon.classList.add('fill-red-500');
        }
    }

    async deleteComment(commentId) {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const commentRef = ref(database, `comments/${this.chapterId}/${commentId}`);
            const snapshot = await get(commentRef);
            const comment = snapshot.val();
            
            if (comment && comment.authorId === user.uid) {
                if (confirm('Are you sure you want to delete this comment?')) {
                    await remove(commentRef);
                }
            }
        } catch (error) {
            console.error("Error deleting comment:", error);
        }
    }

    enableEditing(commentItem) {
        const contentElement = commentItem.querySelector('.comment-content');
        const originalContent = contentElement.textContent;
        const commentId = commentItem.dataset.commentId;
        const editForm = document.createElement('div');
        
        editForm.innerHTML = `
            <textarea class="w-full p-3 border border-gray-200 rounded-lg bg-inherit focus:outline-none focus:border-gray-400 transition-all mb-2"
                rows="2">${originalContent}</textarea>
            <div class="text-right">
                <button class="cancel-edit-btn px-3 py-1.5 mr-2 text-sm">Cancel</button>
                <button class="save-edit-btn px-3 py-1.5 bg-black text-white text-sm rounded hover:bg-gray-800 transition-all">Save</button>
            </div>
        `;

        contentElement.replaceWith(editForm);

        const textarea = editForm.querySelector('textarea');
        textarea.focus();

        // Cancel edit
        editForm.querySelector('.cancel-edit-btn').addEventListener('click', () => {
            editForm.replaceWith(contentElement);
        });

        // Save edit
        editForm.querySelector('.save-edit-btn').addEventListener('click', async () => {
            const newContent = textarea.value.trim();
            if (!newContent) return;

            try {
                const commentRef = ref(database, `comments/${this.chapterId}/${commentId}`);
                await update(commentRef, { content: newContent });
                
                contentElement.textContent = newContent;
                editForm.replaceWith(contentElement);
            } catch (error) {
                console.error("Error updating comment:", error);
                alert("Failed to update. Please try again.");
            }
        });
    }

    async setupCommentElement(element, data) {
        const userRef = ref(database, 'users/' + data.authorId);
        const userSnapshot = await get(userRef);
        const userData = userSnapshot.val();
        const isAuthorComment = userData?.role === 'author';
        const displayName = userData?.username || 'Anonymous';
        
        element.querySelector('.comment-author').innerHTML = `
            @${displayName}
            ${isAuthorComment ? `
                <svg class="inline-block w-4 h-4 ml-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
            </svg>
            ` : ''}
        `;

        element.querySelector('.comment-content').textContent = data.content;
        element.querySelector('.comment-time').textContent = 
            new Date(data.timestamp).toLocaleDateString();

        if (auth.currentUser && data.authorId === auth.currentUser.uid) {
            element.querySelector('.edit-btn').classList.remove('hidden');
            element.querySelector('.delete-btn').classList.remove('hidden');
        }
        
        // Update like button state
        const likeBtn = element.querySelector('.like-btn');
        if (likeBtn) {
            // Ensure likes object exists
            const likes = data.likes || {};
            const likeCount = Object.keys(likes).length;
            const hasLiked = auth.currentUser && likes[auth.currentUser.uid];
            
            // Update count - always show count even if zero
            const likeCountEl = likeBtn.querySelector('.likes-count');
            if (likeCountEl) {
                likeCountEl.textContent = likeCount;
            }
            
            // Update appearance
            if (hasLiked) {
                likeBtn.classList.add('text-red-500');
                const likeIcon = likeBtn.querySelector('svg');
                if (likeIcon) likeIcon.classList.add('fill-red-500');
            } else {
                likeBtn.classList.remove('text-red-500');
                const likeIcon = likeBtn.querySelector('svg');
                if (likeIcon) likeIcon.classList.remove('fill-red-500');
            }
        }
    }

    async renderComment(data, commentId, container = null) {
        // Check if this comment already exists
        if (!container && this.commentsContainer.querySelector(`[data-comment-id="${commentId}"]`)) {
            return;
        }

        const clone = this.commentTemplate.content.cloneNode(true);
        const commentElement = clone.querySelector('.comment-item');
        commentElement.dataset.commentId = commentId;
        
        await this.setupCommentElement(commentElement, data);

        if (container) {
            container.appendChild(commentElement);
        } else {
            this.commentsContainer.appendChild(commentElement);
        }
    }

    initializeComments() {
        console.log('Initializing comments for chapter:', this.chapterId);
        
        const commentsRef = ref(database, `comments/${this.chapterId}`);
        
        // Initial loading of comments
        get(commentsRef).then(snapshot => {
            const comments = snapshot.val() || {};
            this.updateCommentCount(comments);
            this.commentsContainer.innerHTML = '';
            
            if (Object.keys(comments).length > 0) {
                this.renderAllComments(comments);
            } else {
                this.commentsContainer.innerHTML = '<p class="text-gray-500 text-center py-6">No comments yet. Be the first to comment!</p>';
            }
        }).catch(error => {
            console.error("Error loading comments:", error);
            this.commentsContainer.innerHTML = '<p class="text-red-500 text-center py-6">Error loading comments. Please refresh the page.</p>';
        });
        
        // Real-time updates listener
        onValue(commentsRef, (snapshot) => {
            const comments = snapshot.val() || {};
            this.updateCommentCount(comments);
            this.updateChangedComments(comments);
        });
    }

    // Add cleanup method to remove listeners
    cleanup() {
        if (this.unsubscribeAuth) {
            this.unsubscribeAuth();
        }
        if (this.unsubscribeComments) {
            this.unsubscribeComments();
        }
    }

    renderAllComments(comments) {
        const renderedComments = new Set();
        
        // Sort comments by timestamp (newest first)
        Object.entries(comments)
            .sort(([,a], [,b]) => b.timestamp - a.timestamp)
            .forEach(([commentId, comment]) => {
                if (!renderedComments.has(commentId)) {
                    renderedComments.add(commentId);
                    this.renderComment(comment, commentId);
                    console.log(`Rendered comment: ${commentId}`);
                }
            });
        
        console.log(`Total comments rendered: ${renderedComments.size}`);
    }

    countTotalComments(comments) {
        return Object.keys(comments).length;
    }

    updateCommentCount(comments) {
        const totalCount = this.countTotalComments(comments);
        const countText = totalCount === 1 ? '1 Comment' : `${totalCount} Comments`;
        const countElement = document.getElementById('commentCount');
        if (countElement) {
            countElement.textContent = `(${countText})`;
        }
    }

    updateChangedComments(newComments) {
        // Handle deleted comments first
        Array.from(this.commentsContainer.querySelectorAll('.comment-item')).forEach(commentElement => {
            const commentId = commentElement.dataset.commentId;
            if (!newComments[commentId]) {
                commentElement.style.opacity = '0';
                setTimeout(() => commentElement.remove(), 300);
            }
        });

        // Process each new/updated comment
        Object.entries(newComments).forEach(([commentId, comment]) => {
            const existingComment = this.commentsContainer.querySelector(`[data-comment-id="${commentId}"]`);
            
            if (existingComment) {
                this.updateCommentElement(existingComment, comment);
            } else {
                const tempContainer = document.createElement('div');
                this.renderComment(comment, commentId, tempContainer);
                const newCommentElement = tempContainer.firstChild;
                
                if (newCommentElement) {
                    newCommentElement.style.opacity = '0';
                    if (this.commentsContainer.firstChild) {
                        this.commentsContainer.insertBefore(newCommentElement, this.commentsContainer.firstChild);
                    } else {
                        this.commentsContainer.appendChild(newCommentElement);
                    }
                    setTimeout(() => {
                        newCommentElement.style.transition = 'opacity 0.3s ease';
                        newCommentElement.style.opacity = '1';
                    }, 50);
                }
            }
        });
        
        // Handle empty state
        if (Object.keys(newComments).length === 0 && this.commentsContainer.children.length === 0) {
            this.commentsContainer.innerHTML = '<p class="text-gray-500 text-center py-6">No comments yet. Be the first to comment!</p>';
        }
    }

    updateCommentElement(element, data) {
        if (!element) return;
        
        const contentElement = element.querySelector('.comment-content');
        if (contentElement && contentElement.textContent !== data.content) {
            contentElement.textContent = data.content;
        }
        
        // Update like count and state when data changes
        const likeBtn = element.querySelector('.like-btn');
        if (likeBtn) {
            // Make sure likes exist
            const likes = data.likes || {};
            const likeCount = Object.keys(likes).length;
            const likeCountEl = likeBtn.querySelector('.likes-count');
            const hasLiked = auth.currentUser && likes[auth.currentUser.uid];
            
            // Update count
            if (likeCountEl) {
                likeCountEl.textContent = likeCount > 0 ? likeCount : '0';
            }
            
            // Update appearance
            const likeIcon = likeBtn.querySelector('svg');
            if (hasLiked) {
                likeBtn.classList.add('text-red-500');
                if (likeIcon) likeIcon.classList.add('fill-red-500');
            } else {
                likeBtn.classList.remove('text-red-500');
                if (likeIcon) likeIcon.classList.remove('fill-red-500');
            }
        }
    }

    // Update existing comments in the database to add likes field
    async addLikesFieldToExistingComments() {
        try {
            console.log(`Adding likes field to comments for chapter: ${this.chapterId}`);
            const commentsRef = ref(database, `comments/${this.chapterId}`);
            const snapshot = await get(commentsRef);
            
            if (!snapshot.exists()) {
                console.log('No comments found for this chapter');
                return;
            }
            
            const comments = snapshot.val();
            const updates = {};
            let updateCount = 0;
            
            // Check all comments
            Object.entries(comments).forEach(([commentId, comment]) => {
                // Add likes field if it doesn't exist
                if (!comment.likes) {
                    console.log(`Adding likes field to comment: ${commentId}`);
                    updates[`/comments/${this.chapterId}/${commentId}/likes`] = {};
                    updateCount++;
                }
            });
            
            // Apply updates if needed
            if (updateCount > 0) {
                console.log(`Applying ${updateCount} updates to add likes field:`, updates);
                await update(ref(database), updates);
                console.log('Successfully added likes field to existing comments');
            } else {
                console.log('No likes fields needed to be added');
            }
        } catch (error) {
            console.error("Error updating existing comments:", error);
        }
    }
}
