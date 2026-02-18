import Vue from '/js/vue/vue.mjs';
import CitizenshipFeedbackForm from '/js/vue/tools/citizenship-feedback-form.mjs';
import Pagination from '/js/vue/components/pagination.mjs';
import { citizenshipDepartments } from '/js/utils/immigrationOffice.mjs'

import { formatLongDate } from '/js/utils/date.mjs';

export default {
	components: {
		CitizenshipFeedbackForm,
		Pagination,
	},
	data() {
		return {
			department: null,
			isLoading: true,
			resultPages: [], // An array of arrays. First a list of pages, then items on that page
			page: null,
			resultCount: 0,
			itemsPerPage: 10,
			stats: {},
			citizenshipDepartments,
		};
	},
	async mounted(){
		this.loadPage(1, false);
	},
	computed: {
		apiEndpoint(){
			const querystring = new URLSearchParams({ page: this.page });
			if(this.department){
				querystring.append('department', this.department);
			}
			return '/api/forms/citizenship-feedback.json?' + querystring.toString();
		},
		pageCount(){
			return Math.ceil(this.resultCount / this.itemsPerPage);
		},
		resultsPage(){
			return this.isLoading ? [] : this.resultPages[this.page];
		},
		feedbackCount(){
			return this.stats?.first_response_date?.count || 0;
		},
		totalWaitAverage(){
			return this.stats?.total?.readable_average ?? 'unknown';
		},
		totalWaitRange(){
			return this.stats?.total?.readable_range ?? 'a few months';
		},
	},
	methods: {
		formatLongDate,
		async loadPage(page, scrollToTop=true){
			this.page = page;
			if(scrollToTop){
				Vue.nextTick(() => {
					this.$el.querySelector('#feedback-from-other-people').scrollIntoView(true);
				});
			}

			if(!this.resultPages[page]){
				this.isLoading = true;
				const response = await (await fetch(this.apiEndpoint)).json();
				this.resultCount = response.count;
				this.resultPages[page] = response.results.map(r => {
					r.modification_date = new Date(r.modification_date);
					r.application_date = new Date(r.application_date);
					r.first_response_date = r.first_response_date ? new Date(r.first_response_date) : null;
					r.appointment_date = r.appointment_date ? new Date(r.appointment_date) : null;
					return r;
				});
				this.stats = response.stats;
				this.isLoading = false;
			}
		},
		async deleteResult(modificationKey){
			if(confirm('Delete this item?')){
				await fetch(
					`/api/forms/citizenship-feedback/${modificationKey}`, {
						method: 'DELETE',
						keepalive: true,
						headers: {'Content-Type': 'application/json; charset=utf-8'}
					}
				);
				this.resultPages.splice(0, this.resultPages.length);
				this.loadPage(this.page);
			}
		},
		formatTimeDelta(date1, date2){
			const millisecondsPerDay = 1000 * 60 * 60 * 24;
			const days = Math.ceil((date2.getTime() - date1.getTime()) / millisecondsPerDay);
			let qty, unit = null;
			if(days <= 7 * 2){
				qty = days
				unit = (qty === 1 ? 'day' : 'days');
			}
			else if(days <= 7 * 8){
				qty = Math.round(days / 7);
				unit = (qty === 1 ? 'week' : 'weeks');
			}
			else{
				qty = Math.round(days / 30)
				unit = (qty === 1 ? 'month' : 'months');
			}

			return `${qty} ${unit}`;
		},
		stepWaitRange(stepKey){
			if(this.isLoading){
				return 'Loading…';
			}
			const range = this.stats[stepKey]?.readable_range;
			const average = this.stats[stepKey]?.readable_average;
			return range && average ?
				`Wait ${range} — ${average} on average`
				: 'Wait for an unknown duration';
		},
		waitTime(date1, date2, stillWaiting=false) {
			if(stillWaiting){
				const timeDelta = this.formatTimeDelta(date1, date2);
				return timeDelta.startsWith('1 ') ? `${timeDelta} has passed` : `${timeDelta} have passed`;
			}
			else if(date2 >= date1 && !this.isInTheFuture(date2)){
				return `Waited ${this.formatTimeDelta(date1, date2)}`
			}
			return `Waiting ${this.formatTimeDelta(date1, date2)}`;
		},
		isInTheFuture(date){
			return date > (new Date());
		}
	},
	watch: {
		department(){
			this.resultPages = [];
			this.loadPage(1, false);
		},
	},
	template: `
		<div>
			<p>
				In Berlin, it takes <strong v-text="totalWaitRange">a few months</strong> to become a German citizen.
				The average wait time is <span v-text="totalWaitAverage">unknown</span>.
				Based on <a href="#feedback-from-other-people">feedback from <span v-text="feedbackCount">many</span> people</a>.
			</p>

			<div class="buttons bar left">
				<select v-model="department">
					<option :value="null">All departments</option>
					<optgroup label="Citizenship">
						<option v-for="(name, key) in citizenshipDepartments" :key="key" :value="key" v-text="name"></option>
					</optgroup>
				</select>
			</div>

			<div class="citizenship-feedback-summary feedback-summary">
				<div class="steps">
					<div class="step completed">
						<input type="checkbox" checked disabled>
						<span class="description">Send your documents</span>
						<small class="duration" v-text="stepWaitRange('first_response_date')">Loading…</small>
					</div>
					<div class="step completed">
						<input type="checkbox" checked disabled>
						<span class="description">Get a response</span>
						<small class="duration" v-text="stepWaitRange('appointment_date')">Loading…</small>
					</div>
					<div class="step completed">
						<input type="checkbox" checked disabled>
						<span class="description">Become a German citizen</span>
					</div>
				</div>
			</div>

			<h2>Share your experience</h2>

			<citizenship-feedback-form static></citizenship-feedback-form>

			<h2>Feedback from other people</h2>

			<div class="buttons bar left">
				<select v-model="department">
					<option :value="null">All departments</option>
					<optgroup label="Citizenship">
						<option v-for="(name, key) in citizenshipDepartments" :key="key" :value="key" v-text="name"></option>
					</optgroup>
				</select>
			</div>

			<div class="loading" v-if="isLoading">Loading feedback...</div>

			<ul class="feedback-list" v-show="!isLoading">
				<li v-cloak v-for="result in resultsPage" v-if="!isLoading" :key="result.modification_date.toString()">
					<button class="button" v-if="result.modification_key" @click="deleteResult(result.modification_key)">Delete</button>
					<h3>
						Citizenship
						<template v-if="result.appointment_date">in {{ formatTimeDelta(result.application_date, result.appointment_date) }}</template>
						<span class="department">Department <strong>{{ (departments[result.department] || '').split(' — ')[0] }}</strong></span>
					</h3>
					<p v-if="result.notes.length" class="notes">“{{ result.notes.trim() }}”</p>
					<div class="steps">
						<div class="step completed">
							<input type="checkbox" checked disabled>
							<span class="description">Applied <span class="no-mobile">on {{ formatLongDate(result.application_date) }}</span></span>
							<time v-text="formatLongDate(result.application_date)"></time>
						</div>

						<div class="step" :class="{completed: !!result.first_response_date}">
							<input type="checkbox" :checked="result.first_response_date" disabled>
							<span class="description">
								<template v-if="result.first_response_date">
									Got a response {{ formatTimeDelta(result.application_date, result.first_response_date) }} later
								</template>
								<template v-else>
									No response as of {{ formatLongDate(result.modification_date) }}
								</template>
							</span>
							<time v-if="result.first_response_date" v-text="formatLongDate(result.first_response_date)"></time>
						</div>

						<div class="step" v-if="!!result.first_response_date" :class="{completed: !!result.appointment_date}">
							<input type="checkbox" :checked="result.appointment_date" disabled>
							<span class="description">
								<template v-if="result.appointment_date">
									Went to appointment {{ formatTimeDelta(result.first_response_date, result.appointment_date) }} later
								</template>
								<template v-else>
									No appointment as of {{ formatLongDate(result.modification_date) }}
								</template>
							</span>
							<time v-if="result.appointment_date" v-text="formatLongDate(result.appointment_date)"></time>
						</div>
					</div>
				</li>
			</ul>

			<pagination :value="page" @input="loadPage($event, true)" :page-count="pageCount"></pagination>
		</div>
	`,
}