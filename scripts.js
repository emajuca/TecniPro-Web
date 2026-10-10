document.addEventListener('DOMContentLoaded', () => {
    const loginModal = document.getElementById('loginModal');
    const openBtn1 = document.getElementById('openLoginBtn');
    const openBtn2 = document.getElementById('openLoginBtn2');
    const closeBtn = document.getElementById('closeLoginModal');

    const openModal = (e) => {
        e.preventDefault();
        if (loginModal) {
            loginModal.classList.add('active');
        }
    };

    const closeModal = () => {
        if (loginModal) {
            loginModal.classList.remove('active');
        }
    };
    if (openBtn1) openBtn1.addEventListener('click', openModal);
    if (openBtn2) openBtn2.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (loginModal) {
        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) {
                closeModal();
            }
        });
    }
});