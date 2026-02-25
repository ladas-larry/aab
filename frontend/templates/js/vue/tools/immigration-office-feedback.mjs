import Vue from '/js/vue/vue.mjs';
import CitizenshipFeedbackForm from '/js/vue/tools/citizenship-feedback-form.mjs';
import Glossary from '/js/vue/components/glossary.mjs';
import ResidencePermitFeedbackForm from '/js/vue/tools/residence-permit-feedback-form.mjs';
import Pagination from '/js/vue/components/pagination.mjs';
import { citizenshipDepartments } from '/js/utils/immigrationOffice.mjs'
import { formatLongDate, formatTimeDelta } from '/js/utils/date.mjs';
import { residencePermitTypes, residencePermitDepartments, oldResidencePermitDepartments } from '/js/utils/immigrationOffice.mjs';

export default {
	components: {
		CitizenshipFeedbackForm,
		Glossary,
		ResidencePermitFeedbackForm,
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
			oldResidencePermitDepartments,

			residencePermitType: null,
			residencePermitTypes,
			healthInsuranceTypes: {
				PUBLIC: {
					name: "public health insurance",
					glossaryTerm: "gesetzliche Krankenversicherung",
				},
				PRIVATE: {
					name: "private health insurance",
					glossaryTerm: "private Krankenversicherung",
				},
				EXPAT: {
					name: "expat health insurance",
					glossaryTerm: "Expat health insurance",
				},
				FAMILY: {
					name: "family health insurance",
					glossaryTerm: "Familienversicherung",
				},
				EHIC: {
					name: "health insurance from another EU country",
					glossaryTerm: "EHIC",
				},
				OTHER: {
					name: "another health insurance",
					glossaryTerm: null,
				},
			},
		};
	},
	async mounted(){
		this.loadPage(1, false);
	},
	computed: {
		isCitizenship(){
			return this.residencePermitType === 'CITIZENSHIP';
		},
		apiEndpoint(){
			const querystring = new URLSearchParams({ page: this.page });
			if(this.department){
				querystring.append('department', this.department);
			}

			if(this.isCitizenship){
				return '/api/forms/citizenship-feedback.json?' + querystring.toString();	
			}
			else{
				if(this.residencePermitType){
					querystring.append('residence_permit_type', this.residencePermitType);
				}
				return '/api/forms/residence-permit-feedback.json?' + querystring.toString();
			}
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

		residencePermitDepartments(){
			return residencePermitDepartments(this.residencePermitType);
		},

		guideUrl(){
			return {
				BLUE_CARD: '/guides/blue-card',
				WORK_VISA: '/guides/work-visa',
				FREELANCE_VISA: '/guides/freelance-visa',
				PERMANENT_RESIDENCE: '/guides/permanent-residence',
			}[this.residencePermitType] || null;
		},
	},
	methods: {
		formatLongDate,
		healthInsuranceType(result){
			return result.health_insurance_type && this.healthInsuranceTypes[result.health_insurance_type];
		},
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
					r.pick_up_date = r.pick_up_date ? new Date(r.pick_up_date) : null;
					return r;
				});
				this.stats = response.stats;
				this.isLoading = false;
			}
		},
		async deleteResult(modificationKey){
			if(confirm('Delete this item?')){
				const apiEndpoint = '/api/forms/' + (this.isCitizenship ? 'citizenship' : 'residence-permit') + '-feedback/' + modificationKey
				await fetch(
					apiEndpoint, {
						method: 'DELETE',
						keepalive: true,
						headers: {'Content-Type': 'application/json; charset=utf-8'}
					}
				);
				this.resultPages.splice(0, this.resultPages.length);
				this.loadPage(this.page);
			}
		},

		residencePermitName(residencePermitType){
			return {
				CITIZENSHIP: {
					normal: "citizenship",
					capitalized: "Citizenship",
				},
				...this.residencePermitTypes,
			}[residencePermitType] || {
				normal: "residence permit",
				capitalized: "Residence permit"
			};
		},
		departmentName(result){
			const longName = {
				...this.citizenshipDepartments,
				...this.oldResidencePermitDepartments,
				...residencePermitDepartments(),
			}[result.department];
			return longName?.split(' — ')[0];
		},

		formatTimeDelta,
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
		residencePermitType(){
			this.resultPages = [];
			this.department = null;
			this.loadPage(1, false);
			this.$el.querySelector('#immigration-office-wait-times').innerHTML = `${this.residencePermitName(this.residencePermitType).capitalized} wait times`;
		},
	},
	template: `
		<div class="component-group">
			<h2 id="immigration-office-wait-times">Immigration office wait times</h2>
			<p>
				In Berlin, it takes <strong v-text="totalWaitRange">a few months</strong> to
				<template v-if="isCitizenship">become a German citizen.</template>
				<template v-else>get a <span v-text="residencePermitName(residencePermitType).normal">residence permit</span>.</template>

				The average wait time is <span v-text="totalWaitAverage">unknown</span>.

				Wait times vary by <a href="/guides/immigration-office#departments">department</a><span v-if="!residencePermitType">&nbsp;and residence permit type</span>.

				Based on <a href="#feedback-from-other-people">feedback from <span v-text="feedbackCount">many</span> people</a>.
			</p>

			<div class="buttons bar left">
				<select v-model="residencePermitType">
					<optgroup label="Citizenship">
						<option value="CITIZENSHIP">Citizenship</option>
					</optgroup>
					<optgroup label="Residence permits">
						<option :value="null">All residence permits</option>
						<option disabled="disabled">──────────</option>
						<option v-for="(name, key) in residencePermitTypes" :key="key" :value="key" v-text="name.capitalized"></option>
					</optgroup>
				</select>
				<select v-model="department">
					<option :value="null">All departments</option>
					<template v-if="isCitizenship">
						<option v-for="(name, key) in citizenshipDepartments" :key="key" :value="key" v-text="name"></option>
					</template>
					<optgroup label="Current departments" v-if="!isCitizenship">
						<option v-for="(name, key) in residencePermitDepartments" :key="key" :value="key" v-text="name"></option>
					</optgroup>
					<optgroup label="Old departments" v-if="!isCitizenship">
						<option v-for="(name, key) in oldResidencePermitDepartments" :key="key" :value="key" v-text="name"></option>
					</optgroup>
				</select>
			</div>

			<div class="feedback-summary">
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
					<div class="step completed" v-if="isCitizenship">
						<input type="checkbox" checked disabled>
						<span class="description">Become a German citizen</span>
					</div>
					<template v-else>
						<div class="step completed">
							<input type="checkbox" checked disabled>
							<span class="description">Go to your Ausländerbehörde appointment</span>
							<small class="duration" v-text="stepWaitRange('pick_up_date')">Loading…</small>
						</div>
						<div class="step completed">
							<input type="checkbox" checked disabled>
							<span class="description">Pick up your residence card</span>
						</div>
					</template>
				</div>
			</div>

			<p v-if="guideUrl">
				<strong><a :href="guideUrl" class="internal-link">How to apply for the {{ residencePermitTypes[residencePermitType].normal }}</a></strong>
			</p>

			<h2 id="share-your-experience">Share your experience</h2>

			<citizenship-feedback-form v-if="isCitizenship" static></citizenship-feedback-form>
			<residence-permit-feedback-form v-else static></residence-permit-feedback-form>

			<h2 id="feedback-from-other-people">Feedback from other people</h2>

			<div class="buttons bar left">
				<select v-model="residencePermitType">
					<optgroup label="Citizenship">
						<option value="CITIZENSHIP">Citizenship</option>
					</optgroup>
					<optgroup label="Residence permits">
						<option :value="null">All residence permits</option>
						<option disabled="disabled">──────────</option>
						<option v-for="(name, key) in residencePermitTypes" :key="key" :value="key" v-text="name.capitalized"></option>
					</optgroup>
				</select>
				<select v-model="department">
					<option :value="null">All departments</option>
					<template v-if="isCitizenship">
						<option v-for="(name, key) in citizenshipDepartments" :key="key" :value="key" v-text="name"></option>
					</template>
					<optgroup label="Current departments" v-if="!isCitizenship">
						<option v-for="(name, key) in residencePermitDepartments" :key="key" :value="key" v-text="name"></option>
					</optgroup>
					<optgroup label="Old departments" v-if="!isCitizenship">
						<option v-for="(name, key) in oldResidencePermitDepartments" :key="key" :value="key" v-text="name"></option>
					</optgroup>
				</select>
			</div>

			<div class="loading" v-if="isLoading">Loading feedback...</div>
			<ul class="feedback-list" v-show="!isLoading">
				<li v-for="result in resultsPage" v-if="!isLoading" :key="result.modification_date.toString()">
					<button class="button" v-if="result.modification_key" @click="deleteResult(result.modification_key)">Delete</button>
					<h3>
						{{ residencePermitName(result.residence_permit_type || 'CITIZENSHIP').capitalized }}
						<template v-if="isCitizenship && result.appointment_date">in {{ formatTimeDelta(result.application_date, result.appointment_date) }}</template>
						<template v-if="!isCitizenship && result.pick_up_date">in {{ formatTimeDelta(result.application_date, result.pick_up_date) }}</template>
						<span class="department" v-if="departmentName(result)">Department <span v-text="departmentName(result)"></span></span>
						<span class="validity" v-if="result.validity_in_months">
							Valid for
							<template v-if="result.validity_in_months % 12">{{ result.validity_in_months }} month{{ result.validity_in_months === 1 ? '' : 's'}}</template>
							<template v-if="!(result.validity_in_months % 12)">{{ result.validity_in_months/12 }} year{{ result.validity_in_months/12 === 1 ? '' : 's'}}</template>
						</span>
					</h3>
					<p v-if="result.notes.length" class="notes">“{{ result.notes.trim() }}”</p>
					<div class="steps">
						<div class="step completed">
							<input type="checkbox" checked disabled>
							<span class="description">
								Applied <span class="no-mobile">on {{ formatLongDate(result.application_date) }}</span>
								<small class="extra" v-if="healthInsuranceType(result)">
									Using
									<glossary v-if="healthInsuranceType(result).glossaryTerm" :term="healthInsuranceType(result).glossaryTerm">{{ healthInsuranceType(result).name }}</glossary>
									<template v-else>{{ healthInsuranceType(result).name }}</template>
									<template v-if="result.health_insurance_name">(“{{ result.health_insurance_name }}”)</template>
								</small>
							</span>
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

						<div v-if="!isCitizenship && !!result.appointment_date" class="step" :class="{completed: !!result.pick_up_date}">
							<input type="checkbox" :checked="result.pick_up_date" disabled>
							<span class="description">
								<template v-if="result.pick_up_date && isInTheFuture(result.pick_up_date)">
									Will pick up residence card after {{ formatTimeDelta(result.appointment_date, result.pick_up_date) }}
								</template>
								<template v-if="result.pick_up_date && !isInTheFuture(result.pick_up_date)">
									Picked up residence card {{ formatTimeDelta(result.appointment_date, result.pick_up_date) }} later
								</template>
								<template v-else>
									No pick-up date as of {{ formatLongDate(result.modification_date) }}
								</template>
							</span>
							<time v-if="result.pick_up_date" v-text="formatLongDate(result.pick_up_date)"></time>
						</div>
					</div>
				</li>
			</ul>

			<pagination :value="page" @input="loadPage($event, true)" :page-count="pageCount"></pagination>
		</div>
	`,
}