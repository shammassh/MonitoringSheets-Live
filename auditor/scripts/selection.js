// Auditor Selection Scripts

document.getElementById('selection-form').addEventListener('submit', function(e) {
    const store = document.getElementById('store').value;
    const checklist = document.getElementById('checklist').value;
    
    if (!store || !checklist) {
        e.preventDefault();
        alert('Please select both a store and a checklist');
    }
});
