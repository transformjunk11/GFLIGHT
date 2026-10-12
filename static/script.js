document.addEventListener('DOMContentLoaded', () => {
    const fromInput = document.getElementById('from_airport');
    const toInput = document.getElementById('to_airport');
    const dateInput = document.getElementById('date');
    const adultsInput = document.getElementById('adults');
    const seatInput = document.getElementById('seat');
    const swapBtn = document.getElementById('swap-airports');
    const form = document.getElementById('search-form');
    const btnText = document.querySelector('.btn-text');
    const spinner = document.querySelector('.spinner');
    const resultsContainer = document.getElementById('results-container');
    const filterPanel = document.getElementById('filter-panel');
    const maxPriceInput = document.getElementById('max-price');
    const maxDurationInput = document.getElementById('max-duration');
    const filterAirline = document.getElementById('filter-airline');
    const sortBy = document.getElementById('sort-by');
    const priceVal = document.getElementById('price-val');
    const durationVal = document.getElementById('duration-val');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const statTotal = document.getElementById('stat-total');
    const statMinPrice = document.getElementById('stat-min-price');

    // Default search date to 30 days ahead
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    dateInput.value = futureDate.toISOString().split('T')[0];

    // Airport Swap Button
    if (swapBtn) {
        swapBtn.addEventListener('click', () => {
            const temp = fromInput.value;
            fromInput.value = toInput.value;
            toInput.value = temp;
        });
    }

    // Quick Route Chips
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            fromInput.value = chip.dataset.from;
            toInput.value = chip.dataset.to;
            form.dispatchEvent(new Event('submit', { cancelable: true }));
        });
    });

    let allFlights = [];
    let currency = 'INR';

    function formatPrice(amount) {
        if (!amount) return 'N/A';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency || 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    }

    function updateFilterLabels() {
        const p = maxPriceInput.value;
        priceVal.textContent = p == maxPriceInput.max ? 'Any' : formatPrice(Number(p));

        const d = maxDurationInput.value;
        if (d == maxDurationInput.max) {
            durationVal.textContent = 'Any';
        } else {
            const h = Math.floor(d / 60);
            const m = d % 60;
            durationVal.textContent = `${h}h ${m}m`;
        }
    }

    function resetFilters() {
        maxPriceInput.value = maxPriceInput.max;
        maxDurationInput.value = maxDurationInput.max;
        filterAirline.value = 'any';
        sortBy.value = 'price_asc';
        updateFilterLabels();
        applyFilters();
    }

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetFilters);
    }

    [maxPriceInput, maxDurationInput, filterAirline, sortBy].forEach(el => {
        el.addEventListener('input', () => {
            updateFilterLabels();
            applyFilters();
        });
    });

    function applyFilters() {
        const maxP = parseInt(maxPriceInput.value);
        const maxD = parseInt(maxDurationInput.value);
        const airlineVal = filterAirline.value;
        const sortVal = sortBy.value;

        let filtered = allFlights.filter(f => {
            if (maxP < parseInt(maxPriceInput.max) && f.price && f.price > maxP) return false;
            if (maxD < parseInt(maxDurationInput.max) && f.duration && f.duration > maxD) return false;
            if (airlineVal !== 'any' && !f.airlines.includes(airlineVal)) return false;
            return true;
        });

        // Sorting
        filtered.sort((a, b) => {
            if (sortVal === 'price_asc') return (a.price || 0) - (b.price || 0);
            if (sortVal === 'price_desc') return (b.price || 0) - (a.price || 0);
            if (sortVal === 'duration_asc') return (a.duration || 0) - (b.duration || 0);
            if (sortVal === 'duration_desc') return (b.duration || 0) - (a.duration || 0);
            if (sortVal === 'departure_asc') return (a.departure_time || '').localeCompare(b.departure_time || '');
            if (sortVal === 'departure_desc') return (b.departure_time || '').localeCompare(a.departure_time || '');
            return 0;
        });

        // Update stats
        if (statTotal) statTotal.textContent = filtered.length;
        if (statMinPrice) {
            const minP = filtered.reduce((min, f) => (f.price && f.price < min ? f.price : min), Infinity);
            statMinPrice.textContent = minP !== Infinity ? formatPrice(minP) : '-';
        }

        renderResults(filtered);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // UI loading state
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        resultsContainer.innerHTML = '';
        resultsContainer.classList.add('hidden');
        filterPanel.classList.add('hidden');

        const requestData = {
            from_airport: fromInput.value.trim().toUpperCase(),
            to_airport: toInput.value.trim().toUpperCase(),
            date: dateInput.value,
            adults: parseInt(adultsInput.value),
            seat: seatInput.value
        };

        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                let detail = `HTTP ${response.status}`;
                try {
                    const errBody = await response.text();
                    detail += `: ${errBody.substring(0, 300)}`;
                } catch (_) {}
                showError(detail);
                return;
            }

            const data = await response.json();

            if (data.success) {
                allFlights = data.flights || [];
                currency = data.currency || 'INR';

                if (allFlights.length > 0) {
                    filterPanel.classList.remove('hidden');

                    // Calculate max dynamic ranges
                    const prices = allFlights.map(f => f.price).filter(Boolean);
                    if (prices.length > 0) {
                        const highestPrice = Math.max(...prices);
                        maxPriceInput.max = Math.ceil(highestPrice / 1000) * 1000;
                        maxPriceInput.value = maxPriceInput.max;
                    }

                    // Populate airline options
                    const airlines = new Set();
                    allFlights.forEach(f => (f.airlines || []).forEach(a => airlines.add(a)));
                    const sortedAirlines = Array.from(airlines).sort();

                    filterAirline.innerHTML = '<option value="any">All Airlines</option>';
                    sortedAirlines.forEach(a => {
                        const opt = document.createElement('option');
                        opt.value = a;
                        opt.textContent = a;
                        filterAirline.appendChild(opt);
                    });
                }

                updateFilterLabels();
                applyFilters();
            } else {
                let msg = data.error || 'Failed to fetch flights.';
                if (data.hint) msg += `\n\n💡 Hint: ${data.hint}`;
                showError(msg);
            }
        } catch (error) {
            showError(`Network error: ${error.message || error}`);
        } finally {
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

    // Helper for airline icons / emojis
    function getAirlineIcon(name) {
        const lower = (name || '').toLowerCase();
        if (lower.includes('indigo')) return '🔵';
        if (lower.includes('air india')) return '🔴';
        if (lower.includes('spicejet')) return '🟠';
        if (lower.includes('vistara')) return '🟣';
        if (lower.includes('emirates')) return '🇦🇪';
        if (lower.includes('qatar')) return '🇶🇦';
        return '✈️';
    }

    function renderResults(flights) {
        if (!flights || flights.length === 0) {
            resultsContainer.innerHTML = `
                <div class="message-card">
                    <div class="message-icon">🔍</div>
                    <div class="message-title">No matching flights found</div>
                    <div class="message-desc">Try widening your price or duration filters, or search for different dates.</div>
                </div>
            `;
            resultsContainer.classList.remove('hidden');
            return;
        }

        const cheapestPrice = Math.min(...flights.map(f => f.price).filter(Boolean));

        let html = `
            <div class="results-header-info">
                <span class="results-count">Showing <strong>${flights.length}</strong> available flights</span>
            </div>
            <div class="flight-cards-list">
        `;

        flights.forEach((flight, index) => {
            const durationHours = Math.floor((flight.duration || 0) / 60);
            const durationMins = (flight.duration || 0) % 60;
            const durationStr = `${durationHours}h ${durationMins}m`;
            const priceStr = formatPrice(flight.price);
            const isBestDeal = flight.price && flight.price === cheapestPrice;
            const primaryAirline = (flight.airlines && flight.airlines[0]) || 'Airline';
            const icon = getAirlineIcon(primaryAirline);
            const nextDayBadge = flight.next_day ? '<span style="font-size:0.7rem; color:#dc2626; font-weight:700; margin-left:4px;">+1 day</span>' : '';

            html += `
                <article class="flight-card" style="animation-delay: ${Math.min(index * 0.03, 0.4)}s">
                    <!-- Airline Column -->
                    <div class="airline-col">
                        <div class="airline-avatar">${icon}</div>
                        <div class="airline-details">
                            <span class="airline-name">${flight.airlines.join(', ')}</span>
                            <span class="flight-code">${flight.flight_number || 'Non-stop Flight'}</span>
                            <span class="equipment-badge">${flight.equipment || 'Standard Jet'}</span>
                        </div>
                    </div>

                    <!-- Route / Timeline Column -->
                    <div class="route-col">
                        <div class="route-endpoint">
                            <span class="endpoint-time">${flight.departure_time}</span>
                            <span class="endpoint-airport">${flight.from_code || fromInput.value.toUpperCase()}</span>
                        </div>

                        <div class="route-mid">
                            <span class="route-duration">${durationStr}</span>
                            <div class="route-visual">
                                <div class="route-line"></div>
                                <div class="route-plane">✈</div>
                            </div>
                            <span class="route-stops-tag non-stop">Non-stop</span>
                        </div>

                        <div class="route-endpoint" style="text-align: right;">
                            <span class="endpoint-time">${flight.arrival_time}${nextDayBadge}</span>
                            <span class="endpoint-airport">${flight.to_code || toInput.value.toUpperCase()}</span>
                        </div>
                    </div>

                    <!-- Fare / Pricing Column -->
                    <div class="fare-col">
                        ${isBestDeal ? '<span class="deal-tag">✨ Best Value</span>' : ''}
                        <span class="fare-amount">${priceStr}</span>
                        <span class="fare-type">per passenger</span>
                    </div>
                </article>
            `;
        });

        html += `</div>`;
        resultsContainer.innerHTML = html;
        resultsContainer.classList.remove('hidden');
    }

    function showError(message) {
        resultsContainer.innerHTML = `
            <div class="message-card" style="border-color: #fca5a5; background: #fff5f5;">
                <div class="message-icon">⚠️</div>
                <div class="message-title" style="color: #b91c1c;">Unable to complete search</div>
                <div class="message-desc" style="color: #7f1d1d; white-space: pre-wrap; font-family: var(--font-mono); font-size: 0.8rem; background: #fee2e2; padding: 12px; border-radius: 8px; width: 100%; text-align: left;">${message}</div>
            </div>
        `;
        resultsContainer.classList.remove('hidden');
    }
});
