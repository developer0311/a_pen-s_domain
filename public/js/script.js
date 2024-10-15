// // Scroll reveal

// ScrollReveal({
//     reset: true,
//     distance: "60px",
//     duration: 2000,
//     delay: 200
// });

// ScrollReveal().reveal('.home-content, .book-card', {origin: `top`});
// ScrollReveal().reveal('.home-image, .services-container, .portfolio-box, .contact form', {origin: `bottom`});
// ScrollReveal().reveal('.home-content h1, .about-image, .skill-left', {origin: `left`});
// ScrollReveal().reveal('.home-content p, .about-content h3, .skill-right, .about-content p', {origin: `right`});

document.addEventListener("DOMContentLoaded", () => {
  const commentIcons = document.querySelectorAll(".bx-message-rounded-dots");

  commentIcons.forEach((icon) => {
    icon.addEventListener("click", () => {
      const commentSection = icon
        .closest(".book-details")
        .querySelector(".comment-section");

      // Toggle the comment section visibility
      if (
        commentSection.style.display === "none" ||
        commentSection.style.display === ""
      ) {
        commentSection.style.display = "block"; // Show comments
      } else {
        commentSection.style.display = "none"; // Hide comments
      }
    });
  });
});

// document.getElementById('share').addEventListener('click', (e) => {
//     e.preventDefault(); // Prevent default link behavior
//     document.getElementById('shareModal').style.display = 'block';

//     // Set share URLs
//     const currentUrl = window.location.href;
//     document.getElementById('shareFB').href = `https://www.facebook.com/sharer/sharer.php?u=${currentUrl}`;
//     document.getElementById('shareWP').href = `https://api.whatsapp.com/send?text=${currentUrl}`;
//     document.getElementById('shareIG').href = `https://www.instagram.com/?url=${currentUrl}`;
//     document.getElementById('shareLink').onclick = () => {
//         navigator.clipboard.writeText(currentUrl).then(() => {
//             alert("Link copied to clipboard!");
//         });
//     };
// });

// // Close the modal when the user clicks on <span> (x)
// document.getElementById('closeModal').addEventListener('click', () => {
//     document.getElementById('shareModal').style.display = 'none';
// });

// // Close the modal when the user clicks anywhere outside of the modal
// window.onclick = function(event) {
//     if (event.target == document.getElementById('shareModal')) {
//         document.getElementById('shareModal').style.display = 'none';
//     }
// }
