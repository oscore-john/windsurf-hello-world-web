var works = [
  {
    eyebrow: "Literature",
    title: "Don Quixote",
    subtitle: "Miguel de Cervantes' tale of a man who becomes a knight-errant, tilting at windmills and chasing impossible dreams.",
    status: "Published 1605"
  },
  {
    eyebrow: "Painting",
    title: "Starry Night",
    subtitle: "Vincent van Gogh's swirling night sky, painted from his asylum room in Saint-R\u00e9my-de-Provence.",
    status: "Painted 1889"
  },
  {
    eyebrow: "Sculpture",
    title: "David",
    subtitle: "Michelangelo's towering marble masterpiece depicting the biblical hero before his battle with Goliath.",
    status: "Completed 1504"
  },
  {
    eyebrow: "Music",
    title: "Symphony No. 9",
    subtitle: "Beethoven's final complete symphony, featuring the iconic 'Ode to Joy' choral finale.",
    status: "Premiered 1824"
  },
  {
    eyebrow: "Architecture",
    title: "Sagrada Familia",
    subtitle: "Antoni Gaud\u00ed's extraordinary basilica in Barcelona, still under construction after more than a century.",
    status: "Begun 1882"
  },
  {
    eyebrow: "Literature",
    title: "One Hundred Years of Solitude",
    subtitle: "Gabriel Garc\u00eda M\u00e1rquez's multigenerational saga of the Buend\u00eda family in the mythical town of Macondo.",
    status: "Published 1967"
  },
  {
    eyebrow: "Painting",
    title: "The Great Wave",
    subtitle: "Katsushika Hokusai's iconic woodblock print of a towering wave off the coast of Kanagawa.",
    status: "Published c. 1831"
  },
  {
    eyebrow: "Film",
    title: "2001: A Space Odyssey",
    subtitle: "Stanley Kubrick's groundbreaking science-fiction epic exploring humanity's place in the cosmos.",
    status: "Released 1968"
  },
  {
    eyebrow: "Literature",
    title: "The Odyssey",
    subtitle: "Homer's ancient epic following Odysseus on his perilous ten-year journey home from the Trojan War.",
    status: "Written c. 8th century BC"
  },
  {
    eyebrow: "Painting",
    title: "Girl with a Pearl Earring",
    subtitle: "Johannes Vermeer's luminous portrait, often called the 'Mona Lisa of the North.'",
    status: "Painted c. 1665"
  }
];

(function () {
  var work = works[Math.floor(Math.random() * works.length)];
  document.getElementById("eyebrow").textContent = work.eyebrow;
  document.getElementById("title").textContent = work.title;
  document.getElementById("subtitle").textContent = work.subtitle;
  document.getElementById("status").textContent = work.status;
})();
