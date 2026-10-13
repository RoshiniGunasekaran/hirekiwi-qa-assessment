(() => {
  'use strict';

  const { validate, countCharacters, LIMITS } = window.ApplicationValidation;

  const FIELD_NAMES = ['fullName', 'email', 'experience', 'coverNote'];
  const SUBMIT_LABEL = 'Submit application';
  const PENDING_LABEL = 'Submitting…';
  const MESSAGES = {
    duplicate: 'You have already applied for this role.',
    rejected: 'The server could not accept this application. Check your details and try again.',
    server: 'Something went wrong on our side. Your details are still here. Try submitting again.',
    network: 'Could not reach the server. Check your connection, then try again. Your details are still here.',
  };

  const jobId = new URLSearchParams(window.location.search).get('job') || 'qa-engineer';

  const form = document.getElementById('application-form');
  const submitButton = document.getElementById('submit-button');
  const formError = document.getElementById('form-error');
  const confirmation = document.getElementById('confirmation');
  const newApplicationButton = document.getElementById('new-application');
  const noteCounter = document.getElementById('coverNote-count');
  const inputs = {};
  const fieldErrors = {};
  for (const name of FIELD_NAMES) {
    inputs[name] = document.getElementById(name);
    fieldErrors[name] = document.getElementById(`${name}-error`);
  }

  // Guards against a second submit while the first request is still running,
  // whether it comes from a double-click, the Enter key or a script.
  let isSubmitting = false;

  function setSubmitting(value) {
    isSubmitting = value;
    submitButton.disabled = value;
    submitButton.textContent = value ? PENDING_LABEL : SUBMIT_LABEL;
    form.setAttribute('aria-busy', String(value));
  }

  function showFieldError(name, message) {
    const element = fieldErrors[name];
    if (!element) return;
    element.textContent = message;
    element.hidden = false;
    inputs[name].setAttribute('aria-invalid', 'true');
  }

  function clearFieldError(name) {
    fieldErrors[name].textContent = '';
    fieldErrors[name].hidden = true;
    inputs[name].removeAttribute('aria-invalid');
  }

  function showFormError(message) {
    formError.textContent = message;
    formError.hidden = false;
  }

  function clearErrors() {
    FIELD_NAMES.forEach(clearFieldError);
    formError.textContent = '';
    formError.hidden = true;
  }

  function showFieldErrors(errors) {
    for (const name of FIELD_NAMES) {
      if (errors[name]) showFieldError(name, errors[name]);
    }
    const firstInvalid = FIELD_NAMES.find((name) => errors[name]);
    if (firstInvalid) inputs[firstInvalid].focus();
  }

  function updateNoteCounter() {
    const used = countCharacters(inputs.coverNote.value);
    noteCounter.textContent = `${used} / ${LIMITS.noteMax}`;
    noteCounter.classList.toggle('is-over', used > LIMITS.noteMax);
  }

  function showConfirmation(application) {
    confirmation.querySelector('[data-testid="confirmation-name"]').textContent = application.fullName;
    confirmation.querySelector('[data-testid="confirmation-reference"]').textContent = application.id;
    form.hidden = true;
    confirmation.hidden = false;
    confirmation.focus();
  }

  async function readJson(response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  async function handleResponse(response) {
    if (response.status === 201) {
      const application = await readJson(response);
      if (application && application.id) {
        showConfirmation(application);
      } else {
        showFormError(MESSAGES.server);
      }
      return;
    }
    if (response.status === 409) {
      showFormError(MESSAGES.duplicate);
      return;
    }
    if (response.status === 400) {
      const body = await readJson(response);
      if (body && body.errors) {
        showFieldErrors(body.errors);
      } else {
        showFormError(MESSAGES.rejected);
      }
      return;
    }
    showFormError(MESSAGES.server);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    clearErrors();
    const { values, errors } = validate({
      fullName: inputs.fullName.value,
      email: inputs.email.value,
      experience: inputs.experience.value,
      coverNote: inputs.coverNote.value,
    });
    if (Object.keys(errors).length > 0) {
      showFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, ...values }),
      });
      await handleResponse(response);
    } catch {
      showFormError(MESSAGES.network);
    } finally {
      setSubmitting(false);
    }
  });

  for (const name of FIELD_NAMES) {
    inputs[name].addEventListener('input', () => {
      clearFieldError(name);
      if (name === 'coverNote') updateNoteCounter();
    });
  }

  newApplicationButton.addEventListener('click', () => {
    form.reset();
    clearErrors();
    updateNoteCounter();
    confirmation.hidden = true;
    form.hidden = false;
    inputs.fullName.focus();
  });
})();
