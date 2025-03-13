import { auth, database } from './firebase-config.js';
import { ref, push, onValue, remove, update, get } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js';

export class CommentManager {
    constructor(chapterId) {
        this.chapterId = chapterId;
        this.commentTemplate = document.getElementById('commentTemplate');
        this.commentsContainer = document.getElementById('commentsContainer');
        this.commentForm = document.getElementById('commentForm');
        
        this.setupEventListeners();
        this.initializeComments();
    }

    setupEventListeners() {
        this.commentForm.addEventListener('submit', (e) => this.handleNewComment(e));
        this.commentsContainer.addEventListener('click', (e) => this.handleCommentActions(e));
        
        // Add hover effect for like button
        this.commentsContainer.addEventListener('mouseover', (e) => {
            const likeBtn = e.target.closest('.like-btn');
            if (likeBtn) {
                const svg = likeBtn.querySelector('svg');
                svg?.classList.add('scale-110');
            }
        });

        this.commentsContainer.addEventListener('mouseout', (e) => {
            const likeBtn = e.target.closest('.like-btn');
            if (likeBtn) {
                const svg = likeBtn.querySelector('svg');
                svg?.classList.remove('scale-110');
            }
        });
    }

    async handleNewComment(e) {
        e.preventDefault();
        const content = document.getElementById('commentContent').value.trim();
        const user = auth.currentUser;

        if (!content || !user) return;

        try {
            const commentsRef = ref(database, `comments/${this.chapterId}`);
            await push(commentsRef, {
                content,
                authorId: user.uid,
                authorName: user.displayName || 'Anonymous',
                timestamp: Date.now(),
                likes: 0,
                likedBy: {}
            });
            
            document.getElementById('commentContent').value = '';
        } catch (error) {
            console.error("Error posting comment:", error);
            alert("Failed to post comment. Please try again.");
        }
    }

    async handleCommentActions(e) {
        const action = e.target.closest('a, button');
        if (!action) return;
        
        e.preventDefault(); // Prevent anchor tags from navigating
        if (!auth.currentUser) {
            alert('Please login to interact with comments');
            return;
        }
        
        const commentItem = action.closest('.comment-item, .reply-item');
        const commentId = commentItem.dataset.commentId;
        const parentId = commentItem.dataset.parentId;

        // Add visual feedback on click
        const originalColor = action.style.color;
        action.style.color = 'rgb(37, 99, 235)'; // blue-600
        setTimeout(() => action.style.color = originalColor, 200);

        switch (true) {
            case action.classList.contains('like-btn'):
                if (parentId) {
                    await this.handleReplyLike(commentId, parentId);
                } else {
                    await this.handleLike(commentId);
                }
                break;
            case action.classList.contains('delete-btn'):
                await this.deleteComment(commentId);
                break;
            case action.classList.contains('edit-btn'):
                this.enableEditing(commentItem);
                break;
            case action.classList.contains('reply-btn'):
                this.toggleReplyForm(commentItem);
                break;
            case action.classList.contains('submit-reply-btn'):
                await this.handleReply(commentItem, commentId);
                break;
            case action.classList.contains('cancel-reply-btn'):
                this.toggleReplyForm(commentItem);
                break;
        }
    }

    async handleLike(commentId) {
        const user = auth.currentUser;
        if (!user) return;

        const commentRef = ref(database, `comments/${this.chapterId}/${commentId}`);
        const snapshot = await get(commentRef);
        const comment = snapshot.val();
        
        if (comment) {
            const likedBy = comment.likedBy || {};
            const likeButton = this.commentsContainer.querySelector(`[data-comment-id="${commentId}"] .like-btn`);
            const likesCount = likeButton.querySelector('.likes-count');
            const currentLikes = comment.likes || 0;

            if (likedBy[user.uid]) {
                // Unlike: Remove user from likedBy and decrement count
                delete likedBy[user.uid];
                likeButton.classList.remove('text-red-500');
                await update(commentRef, {
                    likes: currentLikes - 1,
                    likedBy
                });
                likesCount.textContent = currentLikes - 1;
            } else {
                // Like: Add user to likedBy and increment count
                likedBy[user.uid] = true;
                likeButton.classList.add('text-red-500');
                await update(commentRef, {
                    likes: currentLikes + 1,
                    likedBy
                });
                likesCount.textContent = currentLikes + 1;
            }
        }
    }

    async handleReplyLike(replyId, parentId) {
        const user = auth.currentUser;
        if (!user) return;

        const commentRef = ref(database, `comments/${this.chapterId}/${parentId}`);
        const snapshot = await get(commentRef);
        const comment = snapshot.val();

        if (comment && comment.replies && comment.replies[replyId]) {
            const reply = comment.replies[replyId];
            const likedBy = reply.likedBy || {};
            const currentLikes = reply.likes || 0;

            const replyElement = this.commentsContainer.querySelector(`[data-comment-id="${replyId}"]`);
            const likeButton = replyElement.querySelector('.like-btn');
            const likesCount = likeButton.querySelector('.likes-count');

            if (likedBy[user.uid]) {
                delete likedBy[user.uid];
                likeButton.classList.remove('text-red-500');
                reply.likes = currentLikes - 1;
            } else {
                likedBy[user.uid] = true;
                likeButton.classList.add('text-red-500');
                reply.likes = currentLikes + 1;
            }

            reply.likedBy = likedBy;
            await update(commentRef, {
                replies: {
                    ...comment.replies,
                    [replyId]: reply
                }
            });

            likesCount.textContent = reply.likes;
        }
    }

    async deleteComment(commentId) {
        const user = auth.currentUser;
        if (!user) return;

        const commentRef = ref(database, `comments/${this.chapterId}/${commentId}`);
        onValue(commentRef, async (snapshot) => {
            const comment = snapshot.val();
            if (comment && comment.authorId === user.uid) {
                if (confirm('Are you sure you want to delete this comment?')) {
                    await remove(commentRef);
                }
            }
        }, { onlyOnce: true });
    }

    enableEditing(commentItem) {
        const contentElement = commentItem.querySelector('.comment-content');
        const originalContent = contentElement.textContent;
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

            const commentId = commentItem.dataset.commentId;
            const commentRef = ref(database, `comments/${this.chapterId}/${commentId}`);

            try {
                await update(commentRef, { content: newContent });
                contentElement.textContent = newContent;
                editForm.replaceWith(contentElement);
            } catch (error) {
                console.error("Error updating comment:", error);
                alert("Failed to update comment. Please try again.");
            }
        });
    }

    toggleReplyForm(commentItem) {
        const replyForm = commentItem.querySelector('.reply-form');
        const wasHidden = replyForm.classList.contains('hidden');
        
        // Reset and hide any other open reply forms
        document.querySelectorAll('.reply-form').forEach(form => {
            form.classList.add('hidden');
            form.querySelector('textarea').value = '';
        });

        if (wasHidden) {
            replyForm.classList.remove('hidden');
            replyForm.querySelector('textarea').focus();
        } else {
            replyForm.classList.add('hidden');
        }
    }

    async handleReply(commentItem, parentId) {
        const replyForm = commentItem.querySelector('.reply-form');
        const textarea = replyForm.querySelector('textarea');
        const content = textarea.value.trim();
        const user = auth.currentUser;

        if (!content || !user) return;

        try {
            const userRef = ref(database, `users/${user.uid}`);
            const userSnapshot = await get(userRef);
            const userData = userSnapshot.val();

            // Get the parent comment ref
            const parentCommentRef = ref(database, `comments/${this.chapterId}/${parentId}`);
            const parentSnapshot = await get(parentCommentRef);
            const parentComment = parentSnapshot.val();

            // Create replies object if it doesn't exist
            const replies = parentComment.replies || {};
            
            // Add new reply
            const replyId = Date.now().toString(); // Simple unique ID
            replies[replyId] = {
                content,
                authorId: user.uid,
                authorName: userData?.characterName || userData?.fullName || 'Anonymous',
                timestamp: Date.now(),
                likes: 0,
                likedBy: {}
            };

            // Update the parent comment with new reply
            await update(parentCommentRef, { replies });
            
            textarea.value = '';
            replyForm.classList.add('hidden');
        } catch (error) {
            console.error("Error posting reply:", error);
            alert("Failed to post reply. Please try again.");
        }
    }

    async renderReply(data, replyId, parentId) {
        const parentComment = this.commentsContainer.querySelector(`[data-comment-id="${parentId}"]`);
        if (!parentComment) return;

        const repliesContainer = parentComment.querySelector('.replies-container');
        const clone = this.commentTemplate.content.cloneNode(true);
        const replyElement = clone.querySelector('.comment-item');
        
        // Set up reply element
        replyElement.dataset.commentId = replyId;
        replyElement.dataset.parentId = parentId;
        
        // Hide reply form and replies container for replies
        const replySection = replyElement.querySelector('.replies-section');
        if (replySection) {
            replySection.remove();
        }
        
        // Remove reply button from replies
        const replyBtn = replyElement.querySelector('.reply-btn');
        if (replyBtn) {
            replyBtn.remove();
        }

        await this.setupCommentElement(replyElement, data);
        
        // Add visual indication that this is a reply
        replyElement.classList.add('ml-8', 'border-l-2', 'border-gray-200', 'pl-4', 'mt-3');
        
        repliesContainer.appendChild(replyElement);
    }

    async setupCommentElement(element, data) {
        const userRef = ref(database, 'users/' + data.authorId);
        const userSnapshot = await get(userRef);
        const userData = userSnapshot.val();
        const isAuthorComment = userData?.role === 'author';
        const displayName = isAuthorComment ? userData.characterName : userData.fullName;
        
        element.querySelector('.comment-author').innerHTML = `
            ${displayName}
            ${isAuthorComment ? `
                <svg class="inline-block w-4 h-4 ml-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                </svg>
            ` : ''}
        `;

        element.querySelector('.comment-content').textContent = data.content;
        element.querySelector('.comment-time').textContent = 
            new Date(data.timestamp).toLocaleDateString();
        element.querySelector('.likes-count').textContent = data.likes || 0;

        if (auth.currentUser && data.authorId === auth.currentUser.uid) {
            element.querySelector('.edit-btn').classList.remove('hidden');
            element.querySelector('.delete-btn').classList.remove('hidden');
        }

        // Check if current user has liked this comment
        if (auth.currentUser && data.likedBy && data.likedBy[auth.currentUser.uid]) {
            element.querySelector('.like-btn').classList.add('text-red-500');
        }
    }

    async renderComment(data, commentId) {
        if (this.commentsContainer.querySelector(`[data-comment-id="${commentId}"]`)) {
            return;
        }

        const clone = this.commentTemplate.content.cloneNode(true);
        const commentElement = clone.querySelector('.comment-item');
        commentElement.dataset.commentId = commentId;
        
        await this.setupCommentElement(commentElement, data);

        // Render replies if they exist
        if (data.replies) {
            const repliesContainer = commentElement.querySelector('.replies-container');
            Object.entries(data.replies)
                .sort(([,a], [,b]) => a.timestamp - b.timestamp)
                .forEach(([replyId, reply]) => {
                    const replyElement = this.createReplyElement(reply, replyId, commentId);
                    repliesContainer.appendChild(replyElement);
                });
        }
        
        this.commentsContainer.appendChild(commentElement);
    }

    createReplyElement(reply, replyId, parentId) {
        const template = document.createElement('div');
        template.innerHTML = `
            <div class="reply-item ml-8 border-l-2 border-gray-200 pl-4 mt-3" data-comment-id="${replyId}" data-parent-id="${parentId}">
                <div class="flex items-start gap-4 p-4 rounded-lg bg-inherit border border-gray-200">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-medium">${reply.authorName}</span>
                            <span class="text-sm text-gray-500">${new Date(reply.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p class="mb-2">${reply.content}</p>
                        <div class="flex items-center gap-6 text-sm text-gray-500">
                            <a href="#" class="like-btn group flex items-center gap-2 hover:text-black transition-colors bg-transparent ${reply.likedBy && reply.likedBy[auth.currentUser?.uid] ? 'text-red-500' : ''}">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                                </svg>
                                <span class="likes-count select-none">${reply.likes || 0}</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return template.firstElementChild;
    }

    initializeComments() {
        const commentsRef = ref(database, `comments/${this.chapterId}`);
        onValue(commentsRef, (snapshot) => {
            this.commentsContainer.innerHTML = '';
            const comments = snapshot.val() || {};
            
            // Count total comments and replies
            let totalCount = 0;
            Object.values(comments).forEach(comment => {
                totalCount++; // Count the comment
                if (comment.replies) {
                    totalCount += Object.keys(comment.replies).length; // Add number of replies
                }
            });

            // Update comment count display
            const countText = totalCount === 1 ? '1 Comment' : `${totalCount} Comments`;
            document.getElementById('commentCount').textContent = `(${countText})`;
            
            // Group comments and replies
            const parentComments = [];
            const replies = {};
            
            // First pass: separate comments and replies
            Object.entries(comments).forEach(([id, comment]) => {
                if (comment.parentId) {
                    if (!replies[comment.parentId]) {
                        replies[comment.parentId] = [];
                    }
                    replies[comment.parentId].push([id, comment]);
                } else {
                    parentComments.push([id, comment]);
                }
            });
            
            // Sort and render comments with their replies
            parentComments
                .sort(([,a], [,b]) => b.timestamp - a.timestamp)
                .forEach(([commentId, comment]) => {
                    // Render parent comment
                    this.renderComment(comment, commentId);
                    
                    // Render its replies
                    const commentReplies = replies[commentId] || [];
                    commentReplies
                        .sort(([,a], [,b]) => a.timestamp - b.timestamp)
                        .forEach(([replyId, reply]) => {
                            this.renderReply(reply, replyId, commentId);
                        });
                });
        });
    }
}
