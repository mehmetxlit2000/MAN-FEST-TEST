const flagRelative = document.querySelector('.q-langue-container-relative');
const flagContainer = document.querySelector('.q-langue-container');

flagRelative.classList.contains('active') ? flagRelative.classList.remove('active') : flagRelative.classList.add('active');

// window.addEventListener('click', function (ket){
//     if (!ket.target.matches('.q-langue-container-relative')){
//         flagRelative.classList.remove('active');
//     }
//
// })

flagContainer.addEventListener('click', (e) => {
    e.stopPropagation();
    flagRelative.classList.toggle('active');
})
