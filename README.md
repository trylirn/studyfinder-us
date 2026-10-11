# Study Finder US

Build a modern, SEO-first Clinical Trial and Research Study Directory focused on the United States.

The platform should help users discover active clinical trials, recruiting medical studies, paid research studies, treatment trials, observational studies, and university-led research opportunities.

The website should be designed for massive programmatic SEO growth and capable of scaling to hundreds of thousands of study records.

DATA SOURCES

The platform must be designed to import and synchronize data from:

ClinicalTrials.gov API

AACT (Aggregate Analysis of ClinicalTrials.gov) PostgreSQL dataset

The import system should support scheduled updates, deduplication, record versioning, and automatic synchronization.

CORE OBJECTIVES

Help users find clinical trials by condition, location, sponsor, status, and phase.

Generate highly optimized SEO pages targeting long-tail searches.

Provide a simple user experience for patients, caregivers, researchers, and healthcare professionals.

Become the most comprehensive clinical trial discovery platform in the United States.

SITE STRUCTURE

Homepage

Large search bar

Search by disease, condition, treatment, city, state, sponsor, or keyword

Featured conditions

Featured recruiting studies

Browse by state

Browse by condition

Recently added studies

Popular searches

Educational content section

Clinical Trial Detail Pages

Each study page should include:

Trial title

NCT ID

Trial phase

Recruitment status

Condition

Brief summary

Detailed description

Eligibility criteria

Age requirements

Gender requirements

Inclusion criteria

Exclusion criteria

Sponsor information

Collaborators

Locations

Contact information

Study dates

Related studies

Similar conditions

AI-generated plain-English summary

SEO metadata

Condition Pages

Examples:

Diabetes Clinical Trials

Breast Cancer Clinical Trials

Alzheimer's Clinical Trials

Obesity Clinical Trials

ADHD Clinical Trials

Each condition page should include:

Condition overview

Total studies

Recruiting studies

Latest studies

Related conditions

Popular locations

Frequently asked questions

SEO content

State Pages

Examples:

Clinical Trials in Texas

Clinical Trials in California

Clinical Trials in Florida

Include:

Total studies

Recruiting studies

Top cities

Top conditions

Recent studies

FAQ section

City Pages

Examples:

Clinical Trials in Houston

Clinical Trials in Dallas

Clinical Trials in Austin

Include:

Study listings

Recruiting studies

Popular conditions

Nearby cities

Sponsor Pages

Examples:

Pfizer Clinical Trials

Moderna Clinical Trials

NIH Clinical Trials

Include:

Sponsor profile

Active studies

Recruiting studies

Conditions studied

Locations

Recruiting Studies Page

Dedicated page showing:

Currently recruiting studies

Open enrollment studies

New recruiting studies

Recently updated studies

Phase Pages

Examples:

Phase 1 Clinical Trials

Phase 2 Clinical Trials

Phase 3 Clinical Trials

Phase 4 Clinical Trials

SEARCH AND FILTERING

Allow users to filter by:

Condition

Disease

State

City

Recruiting status

Study phase

Sponsor

Age group

Gender

Study type

Intervention type

Paid studies

Date updated

USER FEATURES

User registration

Login

Saved studies

Favorite conditions

Saved searches

Email alerts

Study tracking dashboard

Recently viewed studies

AI FEATURES

AI Trial Summary

Convert complex medical terminology into simple language understandable by the average person.

AI Eligibility Checker

Allow users to answer a questionnaire and estimate whether they may qualify for a study.

AI Trial Assistant

Chat interface on each study page that answers questions about that specific study.

SEO REQUIREMENTS

The platform must be built primarily for organic search traffic.

Generate SEO pages automatically for:

Condition pages

State pages

City pages

Sponsor pages

Phase pages

Recruiting pages

Condition + State pages

Condition + City pages

Phase + Condition pages

Sponsor + Condition pages

Examples:

/conditions/diabetes

/states/texas

/cities/houston

/conditions/diabetes/texas

/conditions/diabetes/houston

/phase/3/diabetes

/sponsors/pfizer/oncology

Generate:

Dynamic XML sitemaps

Sitemap index files

Canonical URLs

Structured schema markup

Open Graph tags

Internal linking

Breadcrumbs

SEO-friendly URLs

CONTENT FEATURES

Create an educational content section including:

What are clinical trials?

How clinical trials work

Clinical trial phases explained

Risks and benefits

How to participate

Common eligibility requirements

Frequently asked questions

DATABASE TABLES

Studies

Conditions

Sponsors

Locations

Cities

States

Interventions

Study Phases

Recruitment Statuses

Users

Saved Studies

Saved Searches

Email Alerts

DESIGN REQUIREMENTS

Clean medical design

Professional and trustworthy appearance

Fast-loading pages

Mobile-first

Responsive layout

Accessibility compliant

Easy navigation

High-converting search experience

The final product should be capable of supporting hundreds of thousands of studies, millions of SEO pages, advanced filtering, AI-powered explanations, and a best-in-class clinical trial discovery experience.

Theres should be only one admin account: nokunato@gmail.com, password: Hppavilion1.

There should be no user account. Only admin account. Get the data and populate the directory from now

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://studyfinder-us.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c1fe87b9-fcf0-4e76-b8cc-2d65acf506ba).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
