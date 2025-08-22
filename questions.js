
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const subject = urlParams.get("subject");
  const unit = urlParams.get("unit");
  const mode = urlParams.get("mode"); // 'instant' or 'batch'
  const header = document.getElementById("header");
  header.textContent = `${subject || "Unknown Subject"} - ${unit || "Unknown Unit"} Questions`;

// Sticky Back to Units for all modes
    const backUnitsBtn = document.createElement('button');
    backUnitsBtn.className = 'back-btn';
    backUnitsBtn.textContent = 'Back to Units';
    backUnitsBtn.style.position = 'sticky';
    backUnitsBtn.style.top = '0';
    backUnitsBtn.style.marginBottom = '10px';
    backUnitsBtn.onclick = () => window.location.href = `units.html?subject=${encodeURIComponent(subject || '')}`;
    header.parentNode.insertBefore(backUnitsBtn, header.nextSibling);


  const qList = (questionsData[subject] && questionsData[subject][unit]) || [];
    // Global tracker for answers per question

let currentQuestionIndex = 0; // tracks the current question
let userAnswers = new Array(qList.length).fill(null);

  if (!qList.length) {
    document.getElementById("quiz-container").innerHTML = `<p>No questions found for ${subject || "Unknown Subject"} - ${unit || "Unknown Unit"}</p>`;
    console.warn(`No questions found for ${subject} - ${unit}`);
    return;
  }

  // --- helper ---
  function resolveCorrectIndex(q) {
    if (!q || !Array.isArray(q.options)) return -1;
    if (typeof q.answerIndex === 'number') return q.answerIndex;
    if (q.answer !== undefined && q.answer !== null) {
      const ansNorm = String(q.answer).trim().toLowerCase();
      return q.options.findIndex(opt => String(opt).trim().toLowerCase() === ansNorm);
    }
    return -1;
  }

/// INSTANT MODE

// -- Instant mode replacement (drop-in) --
// expects globals: qList, currentQuestionIndex, userAnswers
function loadQuestion(index) {
  // normalize index and set global
  if (typeof index !== 'number') index = 0;
  if (index < 0) index = 0;
  if (index >= qList.length) index = qList.length - 1;
  currentQuestionIndex = index;

  const q = qList[currentQuestionIndex];
  const container = document.getElementById('quiz-container');
  container.innerHTML = '';

  if (!q) {
    container.innerHTML = '<div class="result">No question data.</div>';
    return;
  }

  const questionBox = document.createElement('div');
  questionBox.className = 'question-box';

  // Question text
  const questionText = document.createElement('div');
  questionText.className = 'question-text';
  questionText.textContent = `Q${currentQuestionIndex + 1}: ${q.question ?? 'Untitled Question'}`;
  questionBox.appendChild(questionText);

  // Choices wrapper
  const choicesDiv = document.createElement('div');
  choicesDiv.className = 'choices';
  questionBox.appendChild(choicesDiv);

  const correctIndex = resolveCorrectIndex(q);

  // Render option buttons first
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice';
    btn.textContent = opt;
    choicesDiv.appendChild(btn);
  });

  // If previously answered, restore state safely (after children exist)
  const prevChoice = userAnswers[currentQuestionIndex];
  if (prevChoice !== null && prevChoice !== undefined) {
    // ensure prevChoice is within bounds
    if (Number.isInteger(prevChoice) && prevChoice >= 0 && prevChoice < choicesDiv.children.length) {
      // disable all buttons
      Array.from(choicesDiv.children).forEach(c => c.disabled = true);

      // mark previously chosen
      const chosenEl = choicesDiv.children[prevChoice];
      if (prevChoice === correctIndex) chosenEl.classList.add('correct');
      else {
        chosenEl.classList.add('wrong');
        if (correctIndex >= 0 && correctIndex < choicesDiv.children.length) choicesDiv.children[correctIndex].classList.add('correct');
      }

      // add explanation (if not already)
      if (q.explanation && !questionBox.querySelector('.explanation')) {
        const exp = document.createElement('div');
        exp.className = 'explanation';
        exp.textContent = `Explanation: ${q.explanation}`;
        questionBox.appendChild(exp);
      }
    } else {
      // invalid prevChoice value — reset it to null to avoid future problems
      userAnswers[currentQuestionIndex] = null;
    }
  } else {
    // Not answered yet: attach click handlers
    Array.from(choicesDiv.children).forEach((c, i) => {
      c.addEventListener('click', () => {
        // guard double-click
        if (userAnswers[currentQuestionIndex] !== null) return;

        userAnswers[currentQuestionIndex] = i;

        // disable all buttons
        Array.from(choicesDiv.children).forEach(btn => btn.disabled = true);

        // mark chosen and show correct/wrong
        if (i === correctIndex) {
          choicesDiv.children[i].classList.add('correct');
        } else {
          choicesDiv.children[i].classList.add('wrong');
          if (correctIndex >= 0 && correctIndex < choicesDiv.children.length) {
            choicesDiv.children[correctIndex].classList.add('correct');
          }
        }

        // append explanation once
        if (q.explanation && !questionBox.querySelector('.explanation')) {
          const exp = document.createElement('div');
          exp.className = 'explanation';
          exp.textContent = `Explanation: ${q.explanation}`;
          questionBox.appendChild(exp);
        }
      });
    });
  }

  // Navigation row
  const navDiv = document.createElement('div');
  navDiv.style.display = 'flex';
  navDiv.style.justifyContent = 'space-between';
  navDiv.style.marginTop = '15px';

  // Back button (hidden on first)
  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'back-btn';
  backBtn.textContent = 'Back';
  backBtn.style.visibility = currentQuestionIndex === 0 ? 'hidden' : 'visible';
  backBtn.addEventListener('click', () => {
    if (currentQuestionIndex > 0) loadQuestion(currentQuestionIndex - 1);
  });
  navDiv.appendChild(backBtn);

  // Next / Finish
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'next-btn';
  nextBtn.textContent = currentQuestionIndex === qList.length - 1 ? 'Finish' : 'Next';
  nextBtn.addEventListener('click', () => {
    if (currentQuestionIndex < qList.length - 1) loadQuestion(currentQuestionIndex + 1);
    else {
      if (typeof showInstantResult === 'function') showInstantResult();
      else console.warn('showInstantResult() not defined.');
    }
  });
  navDiv.appendChild(nextBtn);

  questionBox.appendChild(navDiv);
  container.appendChild(questionBox);
}

// Optional simple showInstantResult if you don't have one:
function showInstantResult() {
  const container = document.getElementById('quiz-container');
  container.innerHTML = '';
  let score = 0;
  qList.forEach((q, i) => {
    if (userAnswers[i] === resolveCorrectIndex(q)) score++;
  });
  const res = document.createElement('div');
  res.className = 'result';
  res.textContent = `You scored ${score} out of ${qList.length}`;
  container.appendChild(res);
  const backUnits = document.createElement('button');
  backUnits.className = 'back-btn';
  backUnits.type = 'button';
  backUnits.textContent = 'Back to Units';
  backUnits.addEventListener('click', () => window.location.href = `units.html?subject=${encodeURIComponent(subject || '')}`);
  container.appendChild(backUnits);
}
  // --- Batch mode --- // 
  function loadBatchQuestions(qList) {
    const container = document.getElementById('quiz-container');
    container.innerHTML = '';
    const userAnswers = new Array(qList.length).fill(null);

    qList.forEach((q, idx) => {
      const questionBox = document.createElement('div');
      questionBox.className = 'question-box';

      const questionText = document.createElement('div');
      questionText.className = 'question-text';
      questionText.textContent = `Q${idx + 1}: ${q.question ?? 'Untitled Question'}`;
      questionBox.appendChild(questionText);

      const choicesDiv = document.createElement('div');
      choicesDiv.className = 'choices';

      const correctIndex = resolveCorrectIndex(q);

      q.options.forEach((choice, i) => {
        const choiceDiv = document.createElement('div');
        choiceDiv.className = 'choice';
        choiceDiv.textContent = choice;

        choiceDiv.onclick = () => {
          userAnswers[idx] = i;
          Array.from(choicesDiv.children).forEach(c => c.classList.remove('selected'));
          choiceDiv.classList.add('selected');
        };

        choicesDiv.appendChild(choiceDiv);
      });

      questionBox.appendChild(choicesDiv);

      const explanationDiv = document.createElement('div');
      explanationDiv.className = 'explanation';
      explanationDiv.style.display = 'none';
      questionBox.appendChild(explanationDiv);

      container.appendChild(questionBox);
    });

    // Submit button
    const submitBtn = document.createElement('button');
    submitBtn.className = 'submit-btn';
    submitBtn.textContent = 'Submit All';
    submitBtn.onclick = () => {
      let score = 0;
      const questionBoxes = container.querySelectorAll('.question-box');

      qList.forEach((q, idx) => {
        const chosenIndex = userAnswers[idx];
        const correctIndex = resolveCorrectIndex(q);
        const choicesDiv = questionBoxes[idx].querySelector('.choices');
        const explanationDiv = questionBoxes[idx].querySelector('.explanation');

        Array.from(choicesDiv.children).forEach((c, i) => {
          c.classList.remove('selected', 'correct', 'wrong');
          if (i === correctIndex) c.classList.add('correct');
          if (i === chosenIndex && chosenIndex !== correctIndex) c.classList.add('wrong');
        });

        if (chosenIndex === correctIndex) score++;

        explanationDiv.style.display = 'block';
        explanationDiv.textContent = `Explanation: ${q.explanation ?? ''}`;
      });

      const resultDiv = document.createElement('div');
      resultDiv.className = 'result';
      resultDiv.textContent = `Your score: ${score} out of ${qList.length}`;
      container.appendChild(resultDiv);

      submitBtn.disabled = true;
    };

    container.appendChild(submitBtn);
  }

  // --- initialize ---
  if (mode === 'instant') loadQuestion(qList[0]);
  else loadBatchQuestions(qList);
});